/// Logical receipt blocks shared by the layout engine and the ESC/POS renderer.
///
/// These types contain no Windows, PDF or spooler dependencies so the whole
/// thermal pipeline can be unit tested without hardware.
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Align {
    #[default]
    Left,
    Center,
    /// Supported by the ESC/POS renderer; kept for totals-style layouts.
    #[allow(dead_code)]
    Right,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineKind {
    Text,
    Blank,
    Divider,
    /// Signals the ESC/POS renderer to feed the remaining paper and cut.
    Cut,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Line {
    pub text: String,
    pub align: Align,
    pub bold: bool,
    /// Render double-width and double-height (ESC/POS `GS !`).
    pub double: bool,
    pub kind: LineKind,
    pub divider_char: Option<char>,
}

impl Line {
    pub fn text(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            align: Align::Left,
            bold: false,
            double: false,
            kind: LineKind::Text,
            divider_char: None,
        }
    }

    pub fn blank() -> Self {
        Self {
            text: String::new(),
            align: Align::Left,
            bold: false,
            double: false,
            kind: LineKind::Blank,
            divider_char: None,
        }
    }

    pub fn divider(ch: char) -> Self {
        Self {
            text: String::new(),
            align: Align::Left,
            bold: false,
            double: false,
            kind: LineKind::Divider,
            divider_char: Some(ch),
        }
    }

    pub fn cut() -> Self {
        Self {
            text: String::new(),
            align: Align::Left,
            bold: false,
            double: false,
            kind: LineKind::Cut,
            divider_char: None,
        }
    }

    pub fn centered(mut self) -> Self {
        self.align = Align::Center;
        self
    }

    pub fn bold(mut self) -> Self {
        self.bold = true;
        self
    }
}

/// Physical capabilities and constraints of the target thermal printer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PrinterProfile {
    pub name: &'static str,
    pub paper_width_mm: u32,
    pub characters_per_line: usize,
    pub supports_cut: bool,
    pub supports_qr: bool,
    pub supports_image: bool,
}

impl PrinterProfile {
    /// Default profiles keyed by paper width. 80 mm → 42 columns (Epson font A),
    /// 58 mm → 32 columns. Characters per line is configurable as an override.
    pub fn for_paper_width(paper_width: &str) -> Self {
        match paper_width {
            "58" => Self {
                name: "58mm",
                paper_width_mm: 58,
                characters_per_line: 32,
                supports_cut: true,
                supports_qr: false,
                supports_image: true,
            },
            _ => Self {
                name: "80mm",
                paper_width_mm: 80,
                characters_per_line: 42,
                supports_cut: true,
                supports_qr: false,
                supports_image: true,
            },
        }
    }

    pub fn with_characters_per_line(mut self, cpl: Option<usize>) -> Self {
        if let Some(cpl) = cpl {
            self.characters_per_line = cpl.clamp(16, 64);
        }
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ItemRow {
    pub name: String,
    pub amount: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TotalRow {
    pub label: String,
    pub amount: i64,
}

/// Ordered receipt blocks. Rendering order follows the HTML/PDF preview so the
/// thermal receipt reflects the same content as the on-screen receipt.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ReceiptDocument {
    pub blocks: Vec<Block>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Block {
    /// Bold, centered lines (gym name, receipt title).
    Header(Vec<String>),
    /// Wrapped centered lines (phone, address, payment status, notes, footer).
    Centered(Vec<String>),
    /// Label on the left, value right-justified (Receipt #, Date, Member, ...).
    Row(String, String),
    Divider,
    /// Wrapped name column with a right-aligned amount column. The current
    /// receipt layout does not emit these yet; kept as the reserved block for
    /// future per-allocation line items.
    #[allow(dead_code)]
    Items(Vec<ItemRow>),
    #[allow(dead_code)]
    Totals(Vec<TotalRow>),
}
