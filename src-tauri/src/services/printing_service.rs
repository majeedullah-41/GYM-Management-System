use base64::Engine;
use printpdf::{BuiltinFont, Color, Image, ImageTransform, Mm, Rgb};

use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::repositories::settings_repository::PrintSettings;
use crate::thermal::model::{Align, LineKind, PrinterProfile};

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
    if print.show_gym_logo && receipt.gym_logo.is_some() {
        lines.push((String::new(), style_spacer(15.0)));
    }
    let profile = PrinterProfile::for_paper_width(&print.paper_width).with_characters_per_line(
        print
            .thermal_characters_per_line
            .map(|value| value as usize),
    );
    let document = crate::thermal::renderer::build_document(receipt, print, footer);
    for line in
        crate::thermal::layout::render_document(&document.blocks, profile.characters_per_line)
    {
        match line.kind {
            LineKind::Divider => push_divider(&mut lines),
            LineKind::Blank => lines.push((String::new(), style_spacer(base_size * 0.3528 * 0.8))),
            LineKind::Cut => {}
            LineKind::Text => {
                let centered = line.align == Align::Center;
                let text = if centered {
                    line.text.trim()
                } else {
                    line.text.trim_end()
                };
                lines.push((text.to_string(), style_text(base_size, centered, line.bold)));
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
        .add_builtin_font(BuiltinFont::Courier)
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::CourierBold)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let layer = doc.get_page(page1).get_layer(layer1);

    if let Some(logo) = print
        .show_gym_logo
        .then(|| receipt.gym_logo.as_deref())
        .flatten()
    {
        if let Err(error) = add_logo_to_pdf(
            &layer,
            logo,
            (paper_width_mm - 22.0) / 2.0,
            content_height_mm - margin,
        ) {
            log::warn!("Could not render gym logo on receipt: {error}");
        }
    }

    let mut cur_y: f32 = content_height_mm - margin;

    for (text, style) in &lines {
        cur_y -= style.height_mm;
        let baseline_y = cur_y + style.height_mm * 0.30;

        if style.divider {
            let divider = "-".repeat(profile.characters_per_line);
            layer.set_fill_color(color(0.08, 0.08, 0.08));
            layer.use_text(divider, base_size, Mm(margin), Mm(baseline_y), &font);
        } else {
            let x = if style.centered {
                let text_w = text_width_mm(text, style.size);
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
            if let Some(right_text) = style.right_text.as_deref() {
                let right_x =
                    (paper_width_mm - margin - text_width_mm(right_text, style.size)).max(margin);
                layer.use_text(right_text, style.size, Mm(right_x), Mm(baseline_y), &font);
            }
        }
    }

    doc.save_to_bytes()
        .map_err(|e| AppError::InternalError(format!("Failed to generate PDF: {e}")))
}

fn color(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

#[derive(Clone)]
struct Style {
    divider: bool,
    size: f32,
    height_mm: f32,
    centered: bool,
    bold: bool,
    right_text: Option<String>,
}

fn style_text(size: f32, centered: bool, bold: bool) -> Style {
    Style {
        divider: false,
        size,
        height_mm: size * 0.3528 * 1.45,
        centered,
        bold,
        right_text: None,
    }
}

fn style_spacer(height_mm: f32) -> Style {
    Style {
        divider: false,
        size: 0.0,
        height_mm,
        centered: false,
        bold: false,
        right_text: None,
    }
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
            right_text: None,
        },
    ));
}

fn text_width_mm(text: &str, size: f32) -> f32 {
    text.chars().count() as f32 * size * 0.3528 * 0.6
}

fn add_logo_to_pdf(
    layer: &printpdf::PdfLayerReference,
    data_url: &str,
    left: f32,
    top: f32,
) -> Result<(), String> {
    let (_, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "invalid logo data".to_string())?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|error| error.to_string())?;
    let decoded =
        printpdf::image_crate::load_from_memory(&bytes).map_err(|error| error.to_string())?;

    let dpi = 300.0_f32;
    let native_width_mm = decoded.width() as f32 * 25.4 / dpi;
    let native_height_mm = decoded.height() as f32 * 25.4 / dpi;
    if native_width_mm <= 0.0 || native_height_mm <= 0.0 {
        return Err("logo has invalid dimensions".to_string());
    }
    let scale = (22.0 / native_width_mm).min(14.0 / native_height_mm);
    let rendered_height = native_height_mm * scale;

    Image::from_dynamic_image(&decoded).add_to_layer(
        layer.clone(),
        ImageTransform {
            translate_x: Some(Mm(left)),
            translate_y: Some(Mm(top - rendered_height)),
            scale_x: Some(scale),
            scale_y: Some(scale),
            dpi: Some(dpi),
            ..Default::default()
        },
    );
    Ok(())
}

#[cfg(test)]
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
            payment_month: Some("August 2026".to_string()), notes: Some("Paid in full".to_string()),
            remaining_balance: 0,
            allocations: Vec::new(),
        }
    }

    fn default_print() -> PrintSettings {
        PrintSettings {
            destination: "pdf".to_string(),
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
            show_payment_month: true,
            show_amount_received: true,
            show_method: true,
            show_received_by: true,
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
    fn renders_receipt_with_logo() {
        let mut receipt = sample_receipt();
        receipt.gym_logo = Some("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=".to_string());
        let bytes = render_receipt_pdf(&receipt, &default_print(), None).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.len() > 500);
    }

    #[test]
    fn respects_hidden_fields() {
        let mut print = default_print();
        print.show_gym_phone = false;
        print.show_gym_address = false;
        print.show_amount_received = false;
        print.show_method = false;
        print.show_received_by = false;
        print.show_remaining_balance = false;
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
