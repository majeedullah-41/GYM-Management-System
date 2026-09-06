//! Thermal receipt printing: Receipt Data Model → Layout → ESC/POS → raw spooler.
//!
//! The pipeline is fully deterministic and runs on pure types until the final
//! raw-spooler call, so every stage is unit-testable without printer hardware.
pub mod escpos;
pub mod layout;
pub mod model;
pub mod printer;
pub mod renderer;

use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::repositories::settings_repository::PrintSettings;
use crate::thermal::model::{Line, PrinterProfile};

/// Render a receipt as an ESC/POS byte stream for the configured printer profile.
pub fn thermal_bytes(
    receipt: &ReceiptResponse,
    print: &PrintSettings,
    footer: Option<&str>,
) -> Result<Vec<u8>, AppError> {
    let profile = PrinterProfile::for_paper_width(&print.paper_width)
        .with_characters_per_line(print.thermal_characters_per_line.map(|c| c as usize));
    let document = renderer::build_document(receipt, print, footer);
    let mut lines = layout::render_document(&document.blocks, profile.characters_per_line);
    lines.push(Line::cut());

    if !layout::lines_fit_profile(&lines, &profile) {
        log::warn!(
            "[thermal] some lines exceed {} columns:\n{}",
            profile.characters_per_line,
            layout::render_lines_as_ascii(&lines)
        );
    }

    let bytes = escpos::encode(&lines, &profile);
    log::info!(
        "[thermal] receipt {} → {} columns, {} lines ({} print rows), {} bytes",
        receipt.receipt_number,
        profile.characters_per_line,
        lines.len(),
        layout::calculate_document_height(&lines),
        bytes.len()
    );
    Ok(bytes)
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
    fn thermal_bytes_is_a_valid_escpos_stream() {
        let bytes = thermal_bytes(&sample_receipt(), &default_print(), None).unwrap();
        assert!(bytes.starts_with(&[0x1B, 0x40]));
        assert!(bytes.ends_with(&[0x1D, 0x56, 0x41]));
        assert!(bytes.len() > 80);
    }

    #[test]
    fn thermal_bytes_uses_configured_characters_per_line() {
        let mut print = default_print();
        print.thermal_characters_per_line = Some(24);
        let bytes = thermal_bytes(&sample_receipt(), &print, None).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        let divider_line = text.lines().find(|l| !l.is_empty() && l.chars().all(|c| c == '-'));
        assert!(divider_line.is_some());
        assert_eq!(divider_line.unwrap().chars().count(), 24);
    }

    #[test]
    fn thermal_bytes_58mm_snapshot() {
        let mut print = default_print();
        print.paper_width = "58".to_string();
        let document = renderer::build_document(&sample_receipt(), &print, None);
        let lines = layout::render_document(&document.blocks, 32);
        let snapshot = layout::render_lines_as_ascii(&lines);
        assert!(snapshot.contains("Fitness Zone"));
        assert!(snapshot.contains("R-0001"));
        assert!(snapshot.contains("Ali Khan"));
        assert!(snapshot.contains("Paid in full"));
        assert!(snapshot.contains("Thank you for being a member"));
    }
}