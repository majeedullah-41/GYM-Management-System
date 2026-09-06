/// Builds a `ReceiptDocument` from the receipt the frontend sends and the print
/// settings stored in the database. The block order mirrors
/// `printing_service::render_receipt_pdf` so the thermal receipt matches the
/// on-screen preview and the PDF output. `font_size` only affects the HTML/PDF
/// renderers; the thermal renderer uses fixed printer columns instead.
use crate::dto::receipt::ReceiptResponse;
use crate::repositories::settings_repository::PrintSettings;
use crate::thermal::model::{Block, ReceiptDocument};
use crate::utils::formatting::format_currency;

pub fn build_document(
    receipt: &ReceiptResponse,
    print: &PrintSettings,
    footer: Option<&str>,
) -> ReceiptDocument {
    let visible_note = receipt
        .notes
        .as_deref()
        .filter(|s| !s.trim().is_empty() && !s.trim().eq_ignore_ascii_case("paid in full"));
    let has_content_after_remaining = print.show_payment_details
        || (print.show_notes && visible_note.is_some())
        || print.show_footer;
    let has_bottom_section = print.show_remaining_balance || has_content_after_remaining;

    let mut blocks = Vec::new();

    let mut header_texts = Vec::new();
    if print.show_gym_name && !receipt.gym_name.trim().is_empty() {
        header_texts.push(receipt.gym_name.trim().to_string());
    }
    if !header_texts.is_empty() {
        blocks.push(Block::Header(header_texts));
    }

    let mut contact_lines = Vec::new();
    if print.show_gym_phone {
        if let Some(p) = receipt
            .gym_phone
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            contact_lines.push(p.trim().to_string());
        }
    }
    if print.show_gym_address {
        if let Some(a) = receipt
            .gym_address
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            contact_lines.push(a.trim().to_string());
        }
    }
    if !contact_lines.is_empty() {
        blocks.push(Block::Centered(contact_lines));
    }

    blocks.push(Block::Divider);

    if print.show_receipt_title {
        blocks.push(Block::Header(vec!["RECEIPT".to_string()]));
    }
    if print.show_receipt_number {
        blocks.push(Block::Row(
            "Receipt #".to_string(),
            receipt.receipt_number.clone(),
        ));
    }
    if print.show_date {
        blocks.push(Block::Row("Date".to_string(), receipt.payment_date.clone()));
    }
    blocks.push(Block::Divider);

    if print.show_member_info {
        if !receipt.member_name.trim().is_empty() {
            blocks.push(Block::Row(
                "Member".to_string(),
                receipt.member_name.trim().to_string(),
            ));
        }
        if !receipt.member_number.trim().is_empty() {
            blocks.push(Block::Row(
                "Member #".to_string(),
                receipt.member_number.trim().to_string(),
            ));
        }
    }
    blocks.push(Block::Divider);

    if print.show_plan_info && !receipt.plan_name.trim().is_empty() {
        blocks.push(Block::Row(
            "Plan".to_string(),
            receipt.plan_name.trim().to_string(),
        ));
    }
    if print.show_period {
        blocks.push(Block::Row(
            "Period".to_string(),
            format!(
                "{} to {}",
                receipt.membership_start_date, receipt.membership_expiry_date
            ),
        ));
    }
    if has_bottom_section {
        blocks.push(Block::Divider);
    }

    if print.show_remaining_balance {
        blocks.push(Block::Row(
            "Remaining".to_string(),
            format_currency(receipt.remaining_balance),
        ));
    }
    if print.show_remaining_balance && has_content_after_remaining {
        blocks.push(Block::Divider);
    }

    if print.show_payment_details {
        let status = if receipt.remaining_balance <= 0 {
            "Paid in full".to_string()
        } else {
            format!(
                "Balance due: {}",
                format_currency(receipt.remaining_balance)
            )
        };
        blocks.push(Block::Centered(vec![status]));
    }

    if print.show_notes {
        if let Some(note) = visible_note {
            blocks.push(Block::Centered(vec![note.trim().to_string()]));
        }
    }

    if print.show_footer {
        let footer = footer
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("Thank you for being a member");
        if !footer.is_empty() {
            blocks.push(Block::Centered(vec![footer.trim().to_string()]));
        }
    }

    ReceiptDocument { blocks }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dto::receipt::ReceiptResponse;

    fn sample_receipt() -> ReceiptResponse {
        ReceiptResponse {
            id: "r1".to_string(),
            receipt_number: "R-0001".to_string(),
            issued_at: "2026-08-28T10:00:00Z".to_string(),
            gym_name: "Fitness Zone".to_string(),
            gym_logo: None,
            gym_address: Some("123 Main Street, Lahore".to_string()),
            gym_phone: Some("+92 300 1234567".to_string()),
            member_name: "Ali Khan".to_string(),
            member_number: "M-001".to_string(),
            plan_name: "Monthly".to_string(),
            amount: 25000,
            payment_method: "Cash".to_string(),
            payment_date: "2026-08-28".to_string(),
            membership_start_date: "2026-08-28".to_string(),
            membership_expiry_date: "2026-09-28".to_string(),
            notes: Some("Paid in full".to_string()),
            remaining_balance: 0,
            allocations: Vec::new(),
        }
    }

    fn default_print() -> PrintSettings {
        PrintSettings {
            destination: "thermal".to_string(),
            paper_width: "80".to_string(),
            font_size: 11,
            thermal_printer_name: None,
            thermal_characters_per_line: None,
            show_gym_name: true,
            show_gym_phone: true,
            show_gym_address: true,
            show_receipt_title: true,
            show_receipt_number: true,
            show_date: true,
            show_member_info: true,
            show_plan_info: true,
            show_period: true,
            show_payment_details: true,
            show_remaining_balance: true,
            show_notes: true,
            show_footer: true,
        }
    }

    #[test]
    fn build_document_matches_pdf_block_order() {
        let doc = build_document(&sample_receipt(), &default_print(), Some("Thank you!"));
        let kinds: Vec<&str> = doc
            .blocks
            .iter()
            .map(|b| match b {
                Block::Header(_) => "header",
                Block::Centered(_) => "centered",
                Block::Row(_, _) => "row",
                Block::Divider => "divider",
                Block::Items(_) => "items",
                Block::Totals(_) => "totals",
            })
            .collect();
        assert_eq!(
            kinds,
            vec![
                "header", "centered", "divider", "header", "row", "row", "divider", "row", "row",
                "divider", "row", "row", "divider", "row", "divider", "centered", "centered"
            ]
        );
    }

    #[test]
    fn build_document_skips_paid_in_full_notes() {
        let doc = build_document(&sample_receipt(), &default_print(), None);
        let centered: Vec<&str> = doc
            .blocks
            .iter()
            .filter_map(|b| match b {
                Block::Centered(lines) => Some(lines[0].as_str()),
                _ => None,
            })
            .collect();
        assert!(centered.contains(&"Paid in full"));
        assert!(!centered.iter().any(|l| *l == "paid in full"));
    }

    #[test]
    fn build_document_respects_hidden_fields() {
        let mut print = default_print();
        print.show_gym_name = false;
        print.show_gym_phone = false;
        print.show_gym_address = false;
        print.show_payment_details = false;
        print.show_footer = false;
        let doc = build_document(&sample_receipt(), &print, Some("ignored"));
        let mut has_centered = false;
        for block in &doc.blocks {
            match block {
                Block::Centered(lines) if lines.is_empty() => {}
                Block::Centered(_) => has_centered = true,
                _ => {}
            }
        }
        assert!(!has_centered);
        assert!(doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Header(lines) if lines == &vec!["RECEIPT".to_string()])));
    }

    #[test]
    fn build_document_includes_balance_due_status() {
        let mut receipt = sample_receipt();
        receipt.remaining_balance = 1000;
        let doc = build_document(&receipt, &default_print(), None);
        let centered: Vec<String> = doc
            .blocks
            .iter()
            .filter_map(|b| match b {
                Block::Centered(lines) => Some(lines.clone()),
                _ => None,
            })
            .flatten()
            .collect();
        assert!(centered.iter().any(|l| l.starts_with("Balance due: Rs. 1,000")));
        assert!(centered.iter().any(|l| l == "Paid in full"));
    }

    #[test]
    fn build_document_uses_default_footer() {
        let doc = build_document(&sample_receipt(), &default_print(), None);
        let footer_texts: Vec<String> = doc
            .blocks
            .iter()
            .filter_map(|b| match b {
                Block::Centered(lines) => Some(lines.clone()),
                _ => None,
            })
            .flatten()
            .collect();
        assert!(footer_texts.iter().any(|l| l == "Thank you for being a member"));
    }
}