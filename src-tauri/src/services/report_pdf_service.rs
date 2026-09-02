use printpdf::path::PaintMode;
use printpdf::{BuiltinFont, Color, Line, Mm, Point, Rect, Rgb};

use crate::dto::report::*;
use crate::errors::AppError;
use crate::repositories::settings_repository::GymSettings;

const A4_WIDTH: f32 = 210.0;
const A4_MARGIN: f32 = 15.0;
const A4_CONTENT_WIDTH: f32 = A4_WIDTH - A4_MARGIN * 2.0;
const A4_PAGE_HEIGHT: f32 = 297.0;
const A4_TOP: f32 = A4_PAGE_HEIGHT - A4_MARGIN;

pub fn render_report_pdf(
    gym: &GymSettings,
    date_from: &Option<String>,
    date_to: &Option<String>,
    financial: &FinancialReportResponse,
    payments: &PaymentReportResponse,
    expenses: &ExpenseReportResponse,
    members: &MemberReportResponse,
    membership_status: &MembershipStatusReportResponse,
) -> Result<Vec<u8>, AppError> {
    let font_size: f32 = 10.0;
    let small_size: f32 = 8.5;
    let title_size: f32 = 16.0;
    let section_size: f32 = 12.0;

    let mut lines: Vec<LineItem> = Vec::new();

    // ── HEADER ──
    lines.push(LineItem::text(&gym.gym_name, title_size, true, Align::Center));
    if let Some(ref phone) = gym.gym_phone {
        if !phone.is_empty() {
            lines.push(LineItem::text(phone, small_size, false, Align::Center));
        }
    }
    if let Some(ref addr) = gym.gym_address {
        if !addr.is_empty() {
            lines.push(LineItem::text(addr, small_size, false, Align::Center));
        }
    }
    lines.push(LineItem::divider());
    lines.push(LineItem::text("GYM REPORT", section_size, true, Align::Center));

    let date_range = match (date_from, date_to) {
        (Some(f), Some(t)) => format!("Period: {} to {}", f, t),
        (Some(f), None) => format!("From: {} onwards", f),
        (None, Some(t)) => format!("Up to: {}", t),
        (None, None) => "All Time".to_string(),
    };
    lines.push(LineItem::text(&date_range, font_size, false, Align::Center));
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    lines.push(LineItem::text(
        &format!("Generated: {}", now),
        small_size,
        false,
        Align::Center,
    ));
    lines.push(LineItem::divider());

    // ── SUMMARY ──
    lines.push(LineItem::text("SUMMARY", section_size, true, Align::Left));
    lines.push(LineItem::kv("Total Revenue", &format!("Rs. {}", fmt_amt(financial.total_revenue))));
    lines.push(LineItem::kv("Total Expenses", &format!("Rs. {}", fmt_amt(financial.total_expenses))));
    lines.push(LineItem::kv(
        "Net Income",
        &format!("Rs. {}", fmt_amt(financial.net_income)),
    ));
    lines.push(LineItem::kv("Total Payments", &financial.payment_count.to_string()));
    lines.push(LineItem::kv("Total Expenses Count", &financial.expense_count.to_string()));
    lines.push(LineItem::kv("Total Members", &members.total_members.to_string()));
    lines.push(LineItem::kv("Active Members", &members.active_members.to_string()));
    lines.push(LineItem::kv("Expiring Soon", &members.expiring_soon.to_string()));
    lines.push(LineItem::kv("Expired Members", &members.expired_members.to_string()));
    lines.push(LineItem::divider());

    // ── REVENUE BY PAYMENT METHOD ──
    if !financial.revenue_by_method.is_empty() {
        lines.push(LineItem::text("REVENUE BY PAYMENT METHOD", section_size, true, Align::Left));
        for item in &financial.revenue_by_method {
            lines.push(LineItem::kv(
                &item.category,
                &format!("Rs. {}", fmt_amt(item.amount)),
            ));
        }
        lines.push(LineItem::divider());
    }

    // ── EXPENSES BY CATEGORY ──
    if !financial.expenses_by_category.is_empty() {
        lines.push(LineItem::text("EXPENSES BY CATEGORY", section_size, true, Align::Left));
        for item in &financial.expenses_by_category {
            lines.push(LineItem::kv(
                &item.category,
                &format!("Rs. {}", fmt_amt(item.amount)),
            ));
        }
        lines.push(LineItem::divider());
    }

    // ── PAYMENT DETAILS TABLE ──
    lines.push(LineItem::text("PAYMENT DETAILS", section_size, true, Align::Left));
    if payments.payments.is_empty() {
        lines.push(LineItem::text("No payments found.", font_size, false, Align::Left));
    } else {
        lines.push(LineItem::text(
            &format!("Total: {} payments  |  Rs. {}", payments.total_count, fmt_amt(payments.total_amount)),
            font_size,
            true,
            Align::Left,
        ));
        // Table header
        lines.push(LineItem::table_row(
            &["Receipt #", "Member", "Amount", "Method", "Date"],
            &[28.0, 30.0, 20.0, 22.0, 20.0],
        ));
        lines.push(LineItem::divider());
        for p in &payments.payments {
            lines.push(LineItem::table_row(
                &[
                    &p.receipt_number,
                    &p.member_name,
                    &format!("Rs. {}", fmt_amt(p.amount)),
                    &p.payment_method,
                    &p.payment_date,
                ],
                &[28.0, 30.0, 20.0, 22.0, 20.0],
            ));
        }
    }
    lines.push(LineItem::divider());

    // ── EXPENSE DETAILS TABLE ──
    lines.push(LineItem::text("EXPENSE DETAILS", section_size, true, Align::Left));
    if expenses.expenses.is_empty() {
        lines.push(LineItem::text("No expenses found.", font_size, false, Align::Left));
    } else {
        lines.push(LineItem::text(
            &format!("Total: {} expenses  |  Rs. {}", expenses.total_count, fmt_amt(expenses.total_amount)),
            font_size,
            true,
            Align::Left,
        ));
        lines.push(LineItem::table_row(
            &["Date", "Description", "Category", "Amount"],
            &[22.0, 38.0, 25.0, 22.0],
        ));
        lines.push(LineItem::divider());
        for e in &expenses.expenses {
            lines.push(LineItem::table_row(
                &[
                    &e.date,
                    &truncate(&e.description, 30),
                    &e.category,
                    &format!("Rs. {}", fmt_amt(e.amount)),
                ],
                &[22.0, 38.0, 25.0, 22.0],
            ));
        }
    }
    lines.push(LineItem::divider());

    // ── MEMBERSHIP STATUS ──
    lines.push(LineItem::text("MEMBERSHIP STATUS", section_size, true, Align::Left));

    // Active members
    lines.push(LineItem::text(
        &format!("Active Members ({})", membership_status.active.len()),
        font_size,
        true,
        Align::Left,
    ));
    if membership_status.active.is_empty() {
        lines.push(LineItem::text("  None.", small_size, false, Align::Left));
    } else {
        lines.push(LineItem::table_row(
            &["Member #", "Name", "Phone", "Plan", "Expiry"],
            &[22.0, 28.0, 25.0, 25.0, 22.0],
        ));
        for m in &membership_status.active {
            lines.push(LineItem::table_row(
                &[
                    &m.member_number,
                    &truncate(&m.full_name, 22),
                    &m.phone.as_deref().unwrap_or("-"),
                    &m.plan_name.as_deref().unwrap_or("-"),
                    &m.expiry_date.as_deref().unwrap_or("-"),
                ],
                &[22.0, 28.0, 25.0, 25.0, 22.0],
            ));
        }
    }
    lines.push(LineItem::divider());

    // Expiring soon
    lines.push(LineItem::text(
        &format!("Expiring Soon ({})", membership_status.expiring_soon.len()),
        font_size,
        true,
        Align::Left,
    ));
    if membership_status.expiring_soon.is_empty() {
        lines.push(LineItem::text("  None.", small_size, false, Align::Left));
    } else {
        lines.push(LineItem::table_row(
            &["Member #", "Name", "Phone", "Plan", "Expiry"],
            &[22.0, 28.0, 25.0, 25.0, 22.0],
        ));
        for m in &membership_status.expiring_soon {
            lines.push(LineItem::table_row(
                &[
                    &m.member_number,
                    &truncate(&m.full_name, 22),
                    &m.phone.as_deref().unwrap_or("-"),
                    &m.plan_name.as_deref().unwrap_or("-"),
                    &m.expiry_date.as_deref().unwrap_or("-"),
                ],
                &[22.0, 28.0, 25.0, 25.0, 22.0],
            ));
        }
    }
    lines.push(LineItem::divider());

    // Expired
    lines.push(LineItem::text(
        &format!("Expired Members ({})", membership_status.expired.len()),
        font_size,
        true,
        Align::Left,
    ));
    if membership_status.expired.is_empty() {
        lines.push(LineItem::text("  None.", small_size, false, Align::Left));
    } else {
        lines.push(LineItem::table_row(
            &["Member #", "Name", "Phone", "Plan", "Expiry"],
            &[22.0, 28.0, 25.0, 25.0, 22.0],
        ));
        for m in &membership_status.expired {
            lines.push(LineItem::table_row(
                &[
                    &m.member_number,
                    &truncate(&m.full_name, 22),
                    &m.phone.as_deref().unwrap_or("-"),
                    &m.plan_name.as_deref().unwrap_or("-"),
                    &m.expiry_date.as_deref().unwrap_or("-"),
                ],
                &[22.0, 28.0, 25.0, 25.0, 22.0],
            ));
        }
    }

    // ── PAGINATE ──
    let usable_height = A4_PAGE_HEIGHT - A4_MARGIN * 2.0 - 10.0;
    let mut pages: Vec<Vec<LineItem>> = Vec::new();
    let mut current_page: Vec<LineItem> = Vec::new();
    let mut current_height: f32 = 0.0;

    for item in &lines {
        let h = item.height;
        if current_height + h > usable_height && !current_page.is_empty() {
            pages.push(current_page);
            current_page = Vec::new();
            current_height = 0.0;
        }
        current_page.push(LineItem {
            text: item.text.clone(),
            size: item.size,
            bold: item.bold,
            align: item.align,
            height: item.height,
            kind: item.kind,
            kv_left: item.kv_left.clone(),
            kv_right: item.kv_right.clone(),
            cells: item.cells.clone(),
            col_widths: item.col_widths.clone(),
        });
        current_height += h;
    }
    if !current_page.is_empty() {
        pages.push(current_page);
    }

    if pages.is_empty() {
        pages.push(vec![LineItem::text("Empty Report", font_size, false, Align::Center)]);
    }

    let page_count = pages.len() as u32;

    // ── BUILD PDF ──
    let (doc, page1, layer1) = printpdf::PdfDocument::new(
        "Gym Report",
        Mm(A4_WIDTH),
        Mm(A4_PAGE_HEIGHT),
        "Layer1",
    );

    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut page_indices: Vec<(printpdf::PdfPageIndex, printpdf::PdfLayerIndex)> =
        Vec::new();
    page_indices.push((page1, layer1));

    for i in 1..page_count {
        let (p, l) = doc.add_page(Mm(A4_WIDTH), Mm(A4_PAGE_HEIGHT), &format!("Page {}", i + 1));
        page_indices.push((p, l));
    }

    for (page_idx, page_lines) in pages.iter().enumerate() {
        let layer = doc.get_page(page_indices[page_idx].0).get_layer(page_indices[page_idx].1);
        let mut cur_y = A4_TOP;

        for item in page_lines {
            cur_y -= item.height;
            let baseline_y = cur_y + item.height * 0.30;

            match item.kind {
                LineKind::Divider => {
                    layer.set_outline_color(c(0.0, 0.0, 0.0));
                    let rect = Rect::new(
                        Mm(A4_MARGIN),
                        Mm(baseline_y - 0.12),
                        Mm(A4_WIDTH - A4_MARGIN),
                        Mm(baseline_y + 0.12),
                    )
                    .with_mode(PaintMode::Fill);
                    layer.add_rect(rect);
                    let p1 = Point::new(Mm(A4_MARGIN), Mm(baseline_y));
                    let p2 = Point::new(Mm(A4_WIDTH - A4_MARGIN), Mm(baseline_y));
                    layer.add_line(Line {
                        points: vec![(p1, true), (p2, true)],
                        is_closed: false,
                    });
                }
                LineKind::Text => {
                    let x = match item.align {
                        Align::Center => {
                            let char_w = item.size * 0.55;
                            let text_w = item.text.chars().count() as f32 * char_w;
                            ((A4_WIDTH - text_w) / 2.0).max(A4_MARGIN)
                        }
                        Align::Left => A4_MARGIN,
                    };
                    if item.bold {
                        layer.set_fill_color(c(0.08, 0.08, 0.08));
                        layer.use_text(item.text.as_str(), item.size, Mm(x), Mm(baseline_y), &font_bold);
                    } else {
                        layer.set_fill_color(c(0.18, 0.18, 0.18));
                        layer.use_text(item.text.as_str(), item.size, Mm(x), Mm(baseline_y), &font);
                    }
                }
                LineKind::KV => {
                    layer.set_fill_color(c(0.18, 0.18, 0.18));
                    layer.use_text(
                        item.kv_left.as_deref().unwrap_or(""),
                        item.size,
                        Mm(A4_MARGIN + 4.0),
                        Mm(baseline_y),
                        &font,
                    );
                    if let Some(ref right) = item.kv_right {
                        let char_w = item.size * 0.55;
                        let rw = right.chars().count() as f32 * char_w;
                        let rx = (A4_WIDTH - A4_MARGIN - rw).max(A4_MARGIN);
                        layer.set_fill_color(c(0.08, 0.08, 0.08));
                        layer.use_text(right.as_str(), item.size, Mm(rx), Mm(baseline_y), &font_bold);
                    }
                }
                LineKind::TableRow => {
                    if let (Some(ref cells), Some(ref widths)) =
                        (&item.cells, &item.col_widths)
                    {
                        let mut x_offset = A4_MARGIN;
                        layer.set_fill_color(c(0.18, 0.18, 0.18));
                        for (cell_text, col_w) in cells.iter().zip(widths.iter()) {
                            let col_mm = A4_CONTENT_WIDTH * col_w / 100.0;
                            let cell_x = x_offset + 1.0;
                            layer.use_text(
                                cell_text.as_str(),
                                item.size,
                                Mm(cell_x),
                                Mm(baseline_y),
                                &font,
                            );
                            x_offset += col_mm;
                        }
                    }
                }
            }
        }

        // Footer on each page
        layer.set_fill_color(c(0.45, 0.45, 0.45));
        let footer_text = format!(
            "Page {}/{}  |  Gym POS Report  |  {}",
            page_idx + 1,
            page_count,
            now
        );
        layer.use_text(
            &footer_text,
            7.0,
            Mm(A4_MARGIN),
            Mm(A4_MARGIN - 2.0),
            &font,
        );
    }

    doc.save_to_bytes()
        .map_err(|e| AppError::InternalError(format!("Failed to generate report PDF: {e}")))
}

// ── helpers ──

fn c(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

#[derive(Clone, Copy)]
enum LineKind {
    Divider,
    Text,
    KV,
    TableRow,
}

#[derive(Clone, Copy)]
enum Align {
    Left,
    Center,
}

#[derive(Clone)]
struct LineItem {
    text: String,
    size: f32,
    bold: bool,
    align: Align,
    height: f32,
    kind: LineKind,
    kv_left: Option<String>,
    kv_right: Option<String>,
    cells: Option<Vec<String>>,
    col_widths: Option<Vec<f32>>,
}

impl LineItem {
    fn text(text: &str, size: f32, bold: bool, align: Align) -> Self {
        LineItem {
            text: text.to_string(),
            size,
            bold,
            align,
            height: size * 1.6,
            kind: LineKind::Text,
            kv_left: None,
            kv_right: None,
            cells: None,
            col_widths: None,
        }
    }

    fn kv(left: &str, right: &str) -> Self {
        let size = 10.0;
        LineItem {
            text: String::new(),
            size,
            bold: false,
            align: Align::Left,
            height: size * 1.5,
            kind: LineKind::KV,
            kv_left: Some(left.to_string()),
            kv_right: Some(right.to_string()),
            cells: None,
            col_widths: None,
        }
    }

    fn divider() -> Self {
        LineItem {
            text: String::new(),
            size: 0.0,
            bold: false,
            align: Align::Left,
            height: 2.5,
            kind: LineKind::Divider,
            kv_left: None,
            kv_right: None,
            cells: None,
            col_widths: None,
        }
    }

    fn table_row(cells: &[&str], col_widths: &[f32]) -> Self {
        let size = 8.5;
        LineItem {
            text: String::new(),
            size,
            bold: false,
            align: Align::Left,
            height: size * 1.5,
            kind: LineKind::TableRow,
            kv_left: None,
            kv_right: None,
            cells: Some(cells.iter().map(|s| s.to_string()).collect()),
            col_widths: Some(col_widths.to_vec()),
        }
    }
}

fn fmt_amt(amount: i64) -> String {
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

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max - 1).collect();
        format!("{}…", truncated)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_gym() -> GymSettings {
        GymSettings {
            gym_name: "Fitness Zone".to_string(),
            gym_address: Some("123 Main Street, Lahore".to_string()),
            gym_phone: Some("+92 300 1234567".to_string()),
            gym_email: None,
            gym_website: None,
        }
    }

    fn sample_financial() -> FinancialReportResponse {
        FinancialReportResponse {
            total_revenue: 55000,
            total_expenses: 20000,
            net_income: 35000,
            payment_count: 12,
            expense_count: 5,
            revenue_by_method: vec![
                CategoryAmount { category: "Cash".to_string(), amount: 35000 },
                CategoryAmount { category: "Card".to_string(), amount: 20000 },
            ],
            expenses_by_category: vec![
                CategoryAmount { category: "Rent".to_string(), amount: 15000 },
                CategoryAmount { category: "Electricity".to_string(), amount: 5000 },
            ],
        }
    }

    fn sample_payments() -> PaymentReportResponse {
        PaymentReportResponse {
            payments: vec![
                PaymentReportRow {
                    receipt_number: "RCP-001".to_string(),
                    member_name: "Ali Khan".to_string(),
                    member_number: "M-001".to_string(),
                    amount: 2000,
                    payment_method: "Cash".to_string(),
                    payment_date: "2026-08-28".to_string(),
                },
            ],
            total_count: 1,
            total_amount: 2000,
        }
    }

    fn sample_expenses() -> ExpenseReportResponse {
        ExpenseReportResponse {
            expenses: vec![
                ExpenseReportRow {
                    date: "2026-08-28".to_string(),
                    description: "Monthly rent".to_string(),
                    category: "Rent".to_string(),
                    amount: 15000,
                },
            ],
            total_count: 1,
            total_amount: 15000,
        }
    }

    fn sample_members() -> MemberReportResponse {
        MemberReportResponse {
            total_members: 10,
            active_members: 7,
            expiring_soon: 2,
            expired_members: 1,
            archived_members: 0,
        }
    }

    fn sample_membership_status() -> MembershipStatusReportResponse {
        MembershipStatusReportResponse {
            active: vec![MemberStatusRow {
                member_number: "M-001".to_string(),
                full_name: "Ali Khan".to_string(),
                phone: Some("+92 300 1234567".to_string()),
                plan_name: Some("Monthly".to_string()),
                expiry_date: Some("2026-09-28".to_string()),
            }],
            expiring_soon: vec![],
            expired: vec![],
        }
    }

    #[test]
    fn renders_valid_pdf() {
        let bytes = render_report_pdf(
            &sample_gym(),
            &Some("2026-08-01".to_string()),
            &Some("2026-08-31".to_string()),
            &sample_financial(),
            &sample_payments(),
            &sample_expenses(),
            &sample_members(),
            &sample_membership_status(),
        )
        .unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.len() > 1000);
        assert!(bytes.windows(5).any(|w| w == b"%%EOF"));
    }

    #[test]
    fn renders_empty_report() {
        let fin = FinancialReportResponse {
            total_revenue: 0,
            total_expenses: 0,
            net_income: 0,
            payment_count: 0,
            expense_count: 0,
            revenue_by_method: vec![],
            expenses_by_category: vec![],
        };
        let pay = PaymentReportResponse { payments: vec![], total_count: 0, total_amount: 0 };
        let exp = ExpenseReportResponse { expenses: vec![], total_count: 0, total_amount: 0 };
        let mem = MemberReportResponse { total_members: 0, active_members: 0, expiring_soon: 0, expired_members: 0, archived_members: 0 };
        let status = MembershipStatusReportResponse { active: vec![], expiring_soon: vec![], expired: vec![] };

        let bytes = render_report_pdf(
            &sample_gym(), &None, &None, &fin, &pay, &exp, &mem, &status,
        ).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.windows(5).any(|w| w == b"%%EOF"));
    }

    #[test]
    fn formats_amounts_correctly() {
        assert_eq!(fmt_amt(0), "0");
        assert_eq!(fmt_amt(999), "999");
        assert_eq!(fmt_amt(1000), "1,000");
        assert_eq!(fmt_amt(25000), "25,000");
        assert_eq!(fmt_amt(1234567), "1,234,567");
    }

    #[test]
    fn truncates_long_strings() {
        assert_eq!(truncate("hello", 10), "hello");
        assert_eq!(truncate("this is a very long string", 10), "this is a\u{2026}");
    }
}
