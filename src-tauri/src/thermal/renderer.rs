/// Builds a `ReceiptDocument` from the receipt the frontend sends and the print
/// settings stored in the database. The block order mirrors
/// `printing_service::render_receipt_pdf` so the thermal receipt matches the
/// on-screen preview and the PDF output. `font_size` only affects the HTML/PDF
/// renderers; the thermal renderer uses fixed printer columns instead.
use crate::dto::receipt::ReceiptResponse;
use crate::repositories::settings_repository::PrintSettings;
use crate::thermal::model::{Block, ReceiptDocument};
use crate::utils::formatting::format_currency;

/// Supplier branding shown at the end of every receipt. Deliberately not tied
/// to any print setting so it cannot be removed from the printed output.
pub const RECEIPT_BRANDING: &str = "Software provided by EagleNest Creations (0346-4451505)";

pub fn build_document(
    receipt: &ReceiptResponse,
    print: &PrintSettings,
    footer: Option<&str>,
) -> ReceiptDocument {
    let mut blocks = Vec::new();

    if print.show_gym_name && !receipt.gym_name.trim().is_empty() {
        blocks.push(Block::Header(vec![receipt.gym_name.trim().to_uppercase()]));
    }

    let mut centered_header = Vec::new();
    if print.show_gym_tagline {
        if let Some(tagline) = receipt
            .gym_tagline
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            centered_header.push(tagline.trim().to_string());
        }
    }
    let address = print
        .show_gym_address
        .then(|| receipt.gym_address.as_deref())
        .flatten()
        .filter(|s| !s.trim().is_empty());
    let phone = print
        .show_gym_phone
        .then(|| receipt.gym_phone.as_deref())
        .flatten()
        .filter(|s| !s.trim().is_empty());
    let contact = match (address, phone) {
        (Some(address), Some(phone)) => Some(format!("{} | {}", address.trim(), phone.trim())),
        (Some(address), None) => Some(address.trim().to_string()),
        (None, Some(phone)) => Some(phone.trim().to_string()),
        (None, None) => None,
    };
    if let Some(contact) = contact {
        centered_header.push(contact);
    }
    if !centered_header.is_empty() {
        blocks.push(Block::Centered(centered_header));
    }

    blocks.push(Block::Divider);

    if print.show_receipt_title {
        blocks.push(Block::Header(vec!["PAYMENT RECEIPT".to_string()]));
    }
    blocks.push(Block::Divider);
    if print.show_receipt_number {
        blocks.push(Block::Row(
            "Receipt #".to_string(),
            receipt.receipt_number.clone(),
        ));
    }
    if print.show_date {
        blocks.push(Block::Row(
            "Date".to_string(),
            format_receipt_date(&receipt.issued_at),
        ));
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
                "Member ID".to_string(),
                receipt.member_number.trim().to_string(),
            ));
        }
    }
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
                "{} - {}",
                format_period_date(&receipt.membership_start_date),
                format_period_date(&receipt.membership_expiry_date)
            ),
        ));
    }

    if print.show_amount_received
        || print.show_method
        || print.show_received_by
        || print.show_remaining_balance
    {
        blocks.push(Block::Divider);
        if print.show_received_by {
            blocks.push(Block::Row("Received By".to_string(), "Admin".to_string()));
        }
        if print.show_amount_received {
            blocks.push(Block::Row(
                "Amount Received".to_string(),
                format_currency(receipt.amount),
            ));
        }
        if print.show_method {
            blocks.push(Block::Row(
                "Method".to_string(),
                receipt.payment_method.clone(),
            ));
        }
        if print.show_remaining_balance {
            blocks.push(Block::Row(
                "Remaining Amount".to_string(),
                format_currency(receipt.remaining_balance),
            ));
        }
    }

    if print.show_footer {
        blocks.push(Block::Divider);
        let footer = footer
            .filter(|s| !s.trim().is_empty())
            .filter(|s| {
                !s.trim()
                    .eq_ignore_ascii_case("Thank you for being a member")
            })
            .unwrap_or("Stay Fit | Stay Healthy");
        blocks.push(Block::Centered(vec![
            "Thank you!".to_string(),
            footer.trim().to_string(),
        ]));
    }

    blocks.push(Block::Divider);
    blocks.push(Block::Centered(vec![RECEIPT_BRANDING.to_string()]));

    ReceiptDocument { blocks }
}

fn format_receipt_date(value: &str) -> String {
    chrono::DateTime::parse_from_rfc3339(value)
        .ok()
        .and_then(|date| {
            chrono::FixedOffset::east_opt(5 * 60 * 60).map(|offset| date.with_timezone(&offset))
        })
        .map(|date| date.format("%d/%m/%Y %I:%M %p").to_string())
        .unwrap_or_else(|| value.to_string())
}

fn format_period_date(value: &str) -> String {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map(|date| date.format("%d/%m/%y").to_string())
        .unwrap_or_else(|_| value.to_string())
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
            gym_tagline: Some("Train Today Be Better".to_string()),
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
            show_gym_logo: true,
            show_gym_tagline: true,
            show_gym_phone: true,
            show_gym_address: true,
            show_receipt_title: true,
            show_receipt_number: true,
            show_date: true,
            show_member_info: true,
            show_plan_info: true,
            show_period: true,
            show_amount_received: true,
            show_method: true,
            show_received_by: true,
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
                "header", "centered", "divider", "header", "divider", "row", "row", "divider",
                "row", "row", "row", "row", "divider", "row", "row", "row", "row", "divider",
                "centered"
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
        assert!(!centered.contains(&"Paid in full"));
        assert!(!centered.iter().any(|l| *l == "paid in full"));
    }

    #[test]
    fn build_document_respects_visibility_fields() {
        let mut print = default_print();
        print.show_gym_name = false;
        print.show_gym_phone = false;
        print.show_gym_address = false;
        print.show_amount_received = false;
        print.show_method = false;
        print.show_received_by = false;
        print.show_remaining_balance = false;
        print.show_footer = false;
        let doc = build_document(&sample_receipt(), &print, Some("ignored"));
        assert!(!doc.blocks.iter().any(
            |b| matches!(b, Block::Header(lines) if lines == &vec!["FITNESS ZONE".to_string()])
        ));
        assert!(doc.blocks.iter().any(
            |b| matches!(b, Block::Header(lines) if lines == &vec!["PAYMENT RECEIPT".to_string()])
        ));
        assert!(!doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Row(label, _) if label == "Amount Received")));
        assert!(!doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Row(label, _) if label == "Remaining Amount")));
    }

    #[test]
    fn build_document_respects_amount_amount_toggles() {
        let mut print = default_print();
        print.show_amount_received = false;
        print.show_remaining_balance = false;
        let doc = build_document(&sample_receipt(), &print, None);
        assert!(!doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Row(label, _) if label == "Amount Received")));
        assert!(!doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Row(label, _) if label == "Remaining Amount")));
        assert!(doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Row(label, _) if label == "Method")));
        assert!(doc
            .blocks
            .iter()
            .any(|b| matches!(b, Block::Row(label, _) if label == "Received By")));
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
        assert!(!centered.iter().any(|l| l.starts_with("Balance due:")));
        assert!(!centered.iter().any(|l| l == "Paid in full"));
        assert!(doc.blocks.iter().any(|block| {
            matches!(block, Block::Row(label, value)
                if label == "Amount Received" && value == "Rs. 25,000")
        }));
        assert!(doc.blocks.iter().any(|block| {
            matches!(block, Block::Row(label, value)
                if label == "Remaining Amount" && value == "Rs. 1,000")
        }));
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
        assert!(footer_texts.iter().any(|l| l == "Stay Fit | Stay Healthy"));
    }
}
