use printpdf::path::PaintMode;
use printpdf::{BuiltinFont, Color, Line, Mm, Point, Rect, Rgb};

use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::repositories::settings_repository::PrintSettings;

pub fn render_receipt_pdf(
    receipt: &ReceiptResponse,
    print: &PrintSettings,
    footer: Option<&str>,
) -> Result<Vec<u8>, AppError> {
    let paper_width_mm: f32 = if print.paper_width == "58" {
        58.0
    } else {
        80.0
    };
    let base_size: f32 = print.font_size.clamp(8, 16) as f32;
    let margin: f32 = 4.0;

    let mut lines: Vec<(String, Style)> = Vec::new();

    if print.show_gym_name && !receipt.gym_name.trim().is_empty() {
        push_centered(&mut lines, receipt.gym_name.trim(), true, base_size + 1.0);
    }
    if print.show_gym_phone {
        if let Some(p) = receipt
            .gym_phone
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            push_centered(&mut lines, p.trim(), false, base_size * 0.9);
        }
    }
    if print.show_gym_address {
        if let Some(a) = receipt
            .gym_address
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            for piece in wrap(a.trim(), paper_width_mm - margin * 2.0, base_size * 0.9) {
                push_centered(&mut lines, &piece, false, base_size * 0.9);
            }
        }
    }
    push_divider(&mut lines);

    if print.show_receipt_title {
        push_centered(&mut lines, "PAYMENT RECEIPT", true, base_size);
    }
    if print.show_receipt_number {
        push_left(
            &mut lines,
            format!("Receipt #: {}", receipt.receipt_number),
            base_size,
        );
    }
    if print.show_date {
        push_left(
            &mut lines,
            format!("Date: {}", receipt.payment_date),
            base_size,
        );
    }
    push_divider(&mut lines);

    if print.show_member_info {
        if !receipt.member_name.trim().is_empty() {
            push_left(
                &mut lines,
                format!("Member: {}", receipt.member_name),
                base_size,
            );
        }
        if !receipt.member_number.trim().is_empty() {
            push_left(
                &mut lines,
                format!("Member #: {}", receipt.member_number),
                base_size,
            );
        }
    }
    push_divider(&mut lines);

    if print.show_plan_info {
        if !receipt.plan_name.trim().is_empty() {
            push_left(
                &mut lines,
                format!("Plan: {}", receipt.plan_name),
                base_size,
            );
        }
    }
    if print.show_period {
        let period = format!(
            "{}  to  {}",
            receipt.membership_start_date, receipt.membership_expiry_date
        );
        push_left(&mut lines, format!("Period: {}", period), base_size);
    }
    push_divider(&mut lines);

    if print.show_payment_details {
        push_left(
            &mut lines,
            format!("Method: {}", receipt.payment_method),
            base_size,
        );
        push_centered(
            &mut lines,
            &format!("AMOUNT PAID  Rs. {}", format_amount(receipt.amount)),
            true,
            base_size + 1.0,
        );
    }
    if print.show_remaining_balance && receipt.remaining_balance > 0 {
        push_left(
            &mut lines,
            format!(
                "Remaining: Rs. {}",
                format_amount(receipt.remaining_balance)
            ),
            base_size,
        );
    }
    push_divider(&mut lines);

    if print.show_notes {
        if let Some(n) = receipt.notes.as_deref().filter(|s| !s.trim().is_empty()) {
            for piece in wrap(n.trim(), paper_width_mm - margin * 2.0, base_size) {
                push_centered(&mut lines, &piece, false, base_size);
            }
            push_divider(&mut lines);
        }
    }

    if print.show_footer {
        if let Some(f) = footer.filter(|s| !s.trim().is_empty()) {
            for piece in wrap(f.trim(), paper_width_mm - margin * 2.0, base_size * 0.85) {
                push_centered(&mut lines, &piece, false, base_size * 0.85);
            }
        }
    }

    let content_height_mm =
        lines.iter().map(|(_, s)| s.height_mm).sum::<f32>() + margin * 2.0 + 8.0;

    let (doc, page1, layer1) = printpdf::PdfDocument::new(
        "Receipt",
        Mm(paper_width_mm),
        Mm(content_height_mm),
        "Layer1",
    );

    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let layer = doc.get_page(page1).get_layer(layer1);

    let mut cur_y: f32 = content_height_mm - margin;

    for (text, style) in &lines {
        cur_y -= style.height_mm;
        let baseline_y = cur_y + style.height_mm * 0.30;

        if style.divider {
            let y = baseline_y;
            layer.set_outline_color(color(0.0, 0.0, 0.0));
            let rect = Rect::new(
                Mm(margin),
                Mm(y - 0.12),
                Mm(paper_width_mm - margin),
                Mm(y + 0.12),
            )
            .with_mode(PaintMode::Fill);
            layer.add_rect(rect);
            let p1 = Point::new(Mm(margin), Mm(y));
            let p2 = Point::new(Mm(paper_width_mm - margin), Mm(y));
            layer.add_line(Line {
                points: vec![(p1, true), (p2, true)],
                is_closed: false,
            });
        } else {
            let x = if style.centered {
                let char_w = style.size * 0.55;
                let text_w = text.chars().count() as f32 * char_w;
                ((paper_width_mm - text_w) / 2.0).max(margin)
            } else {
                margin
            };
            if style.bold {
                layer.set_fill_color(color(0.08, 0.08, 0.08));
                layer.use_text(text.as_str(), style.size, Mm(x), Mm(baseline_y), &font_bold);
            } else {
                layer.set_fill_color(color(0.18, 0.18, 0.18));
                layer.use_text(text.as_str(), style.size, Mm(x), Mm(baseline_y), &font);
            }
        }
    }

    doc.save_to_bytes()
        .map_err(|e| AppError::InternalError(format!("Failed to generate PDF: {e}")))
}

fn color(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

#[derive(Clone, Copy)]
struct Style {
    divider: bool,
    size: f32,
    height_mm: f32,
    centered: bool,
    bold: bool,
}

fn style_text(size: f32, centered: bool, bold: bool) -> Style {
    Style {
        divider: false,
        size,
        height_mm: size * 1.7,
        centered,
        bold,
    }
}

fn push_left(lines: &mut Vec<(String, Style)>, text: String, size: f32) {
    lines.push((text, style_text(size, false, false)));
}

fn push_centered(lines: &mut Vec<(String, Style)>, text: &str, bold: bool, size: f32) {
    lines.push((text.to_string(), style_text(size, true, bold)));
}

fn push_divider(lines: &mut Vec<(String, Style)>) {
    lines.push((
        String::new(),
        Style {
            divider: true,
            size: 0.0,
            height_mm: 2.6,
            centered: false,
            bold: false,
        },
    ));
}

fn format_amount(amount: i64) -> String {
    let digits = amount.to_string();
    let mut out = String::new();
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    out
}

fn wrap(text: &str, width_mm: f32, size: f32) -> Vec<String> {
    let char_w = size * 0.55;
    let max_chars = (width_mm / char_w).floor().max(4.0) as usize;
    let mut result = Vec::new();
    let mut current = String::new();
    for w in text.split_whitespace() {
        if !current.is_empty() && current.chars().count() + 1 + w.chars().count() > max_chars {
            let taken = std::mem::take(&mut current);
            result.push(taken);
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(w);
    }
    if !current.is_empty() {
        result.push(current);
    }
    if result.is_empty() {
        result.push(text.to_string());
    }
    result
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
            destination: "pdf".to_string(),
            paper_width: "80".to_string(),
            font_size: 11,
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
    fn renders_a_valid_pdf_for_80mm() {
        let bytes =
            render_receipt_pdf(&sample_receipt(), &default_print(), Some("Thank you!")).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.len() > 500);
        assert!(bytes.windows(5).any(|w| w == b"%%EOF"));
    }

    #[test]
    fn renders_a_valid_pdf_for_58mm() {
        let mut print = default_print();
        print.paper_width = "58".to_string();
        let bytes = render_receipt_pdf(&sample_receipt(), &print, None).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.len() > 300);
        assert!(bytes.windows(5).any(|w| w == b"%%EOF"));
    }

    #[test]
    fn respects_hidden_fields() {
        let mut print = default_print();
        print.show_gym_phone = false;
        print.show_gym_address = false;
        print.show_payment_details = false;
        print.show_notes = false;
        let bytes = render_receipt_pdf(&sample_receipt(), &print, None).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.windows(5).any(|w| w == b"%%EOF"));
    }

    #[test]
    fn formats_amounts_with_commas() {
        assert_eq!(format_amount(1000), "1,000");
        assert_eq!(format_amount(25000), "25,000");
        assert_eq!(format_amount(999), "999");
        assert_eq!(format_amount(0), "0");
    }
}
