/// ESC/POS byte builder (EPSON-compatible command set).
///
/// The layout engine decides WHAT to print (`Line`s); this module decides HOW:
/// command bytes for a physical thermal printer. Only ASCII printable text is
/// sent; any other character is replaced with `?` because multi-byte encodings
/// are printer-specific.
use crate::thermal::model::{Align, Line, LineKind, PrinterProfile};

const ESC: u8 = 0x1B;
const GS: u8 = 0x1D;

/// Encode a rendered document into a raw ESC/POS byte stream.
pub fn encode(lines: &[Line], profile: &PrinterProfile) -> Vec<u8> {
    let mut w = Escpos::new();
    w.init();

    let mut current_align: Option<Align> = None;
    let mut current_bold = false;
    let mut current_double = false;

    for line in lines {
        match line.kind {
            LineKind::Cut => {
                w.feed(3);
                if profile.supports_cut {
                    w.cut(true);
                }
            }
            LineKind::Blank => w.lf(),
            LineKind::Divider => {
                if current_align != Some(Align::Left) {
                    w.align(Align::Left);
                    current_align = Some(Align::Left);
                }
                if current_bold {
                    w.set_bold(false);
                    current_bold = false;
                }
                if current_double {
                    w.set_double(false);
                    current_double = false;
                }
                let mut text = String::new();
                for _ in 0..profile.characters_per_line {
                    text.push(line.divider_char.unwrap_or('-'));
                }
                w.text(&text);
            }
            LineKind::Text => {
                if current_align != Some(line.align) {
                    w.align(line.align);
                    current_align = Some(line.align);
                }
                if current_bold != line.bold {
                    w.set_bold(line.bold);
                    current_bold = line.bold;
                }
                if current_double != line.double {
                    w.set_double(line.double);
                    current_double = line.double;
                }
                w.text(&line.text);
            }
        }
    }
    w.into_bytes()
}

/// Streaming ESC/POS writer. Emits exactly one command per method, making the
/// byte output easy to assert in tests.
#[derive(Default)]
pub struct Escpos {
    bytes: Vec<u8>,
}

impl Escpos {
    pub fn new() -> Self {
        Self::default()
    }

    /// `ESC @` — initialize the printer.
    pub fn init(&mut self) {
        self.bytes.extend_from_slice(&[ESC, 0x40]);
    }

    /// LF — print the buffer (one line).
    pub fn lf(&mut self) {
        self.bytes.push(0x0A);
    }

    /// `ESC d n` — print and feed n lines.
    pub fn feed(&mut self, lines: u8) {
        self.bytes.extend_from_slice(&[ESC, 0x64, lines]);
    }

    /// `ESC a n` — set alignment (0 left, 1 center, 2 right).
    pub fn align(&mut self, align: Align) {
        let n = match align {
            Align::Left => 0,
            Align::Center => 1,
            Align::Right => 2,
        };
        self.bytes.extend_from_slice(&[ESC, 0x61, n]);
    }

    /// `ESC E n` — emphasis on/off.
    pub fn set_bold(&mut self, on: bool) {
        self.bytes.extend_from_slice(&[ESC, 0x45, on as u8]);
    }

    /// `GS ! n` — double-width/double-height on/off (0x11 = double both).
    pub fn set_double(&mut self, on: bool) {
        let n = if on { 0x11 } else { 0x00 };
        self.bytes.extend_from_slice(&[GS, 0x21, n]);
    }

    /// Write text followed by LF. Non-ASCII characters become `?`.
    pub fn text(&mut self, text: &str) {
        self.bytes.extend(encode_text(text));
        self.lf();
    }

    /// `GS V m` — cut (0x41 full, 0x31 partial).
    pub fn cut(&mut self, full: bool) {
        self.bytes
            .extend_from_slice(&[GS, 0x56, if full { 0x41 } else { 0x31 }]);
    }

    pub fn into_bytes(self) -> Vec<u8> {
        self.bytes
    }
}

fn encode_text(text: &str) -> Vec<u8> {
    text.chars()
        .map(|c| if c.is_ascii() && (c.is_ascii_graphic() || c == ' ') { c as u8 } else { b'?' })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_starts_with_initialize() {
        let bytes = encode(&[], &PrinterProfile::for_paper_width("80"));
        assert_eq!(&bytes[..2], &[ESC, 0x40]);
    }

    #[test]
    fn encode_sets_alignment_bold_and_text() {
        let lines = vec![
            Line::text("Fitness Zone".to_string()).bold().centered(),
            Line::text("Ali Khan".to_string()),
        ];
        let bytes = encode(&lines, &PrinterProfile::for_paper_width("80"));
        let text = String::from_utf8_lossy(&bytes);
        assert!(bytes.windows(3).any(|w| w == [ESC, 0x61, 0x01]));
        assert!(bytes.windows(3).any(|w| w == [ESC, 0x45, 0x01]));
        assert!(text.contains("Fitness Zone"));
        assert!(text.contains("Ali Khan"));
    }

    #[test]
    fn encode_ends_with_feed_and_full_cut() {
        let lines = vec![Line::text("done".to_string()), Line::cut()];
        let bytes = encode(&lines, &PrinterProfile::for_paper_width("58"));
        assert!(bytes.ends_with(&[GS, 0x56, 0x41]));
        assert!(bytes.windows(3).any(|w| w == [ESC, 0x64, 0x03]));
    }

    #[test]
    fn encode_omits_cut_when_unsupported() {
        let mut profile = PrinterProfile::for_paper_width("80");
        profile.supports_cut = false;
        let lines = vec![Line::cut()];
        let bytes = encode(&lines, &profile);
        assert!(!bytes.windows(3).any(|w| w == [GS, 0x56, 0x41]));
    }

    #[test]
    fn divider_matches_column_width() {
        let mut profile = PrinterProfile::for_paper_width("58");
        profile.characters_per_line = 8;
        let bytes = encode(&[Line::divider('-')], &profile);
        // [..2] init + 8 dashes + LF = 11 bytes
        assert_eq!(bytes.len(), 11);
        assert_eq!(&bytes[2..10], b"--------");
    }

    #[test]
    fn non_ascii_is_replaced() {
        assert_eq!(encode_text("Rs. 1,000"), b"Rs. 1,000");
        assert_eq!(encode_text("aژ"), b"a?");
    }

    #[test]
    fn escpos_writer_sequences() {
        let mut w = Escpos::new();
        w.init();
        w.align(Align::Center);
        w.set_bold(true);
        w.text("OK");
        w.cut(true);
        let bytes = w.into_bytes();
        assert!(bytes.windows(4).any(|w| w == &[ESC, 0x61, 0x01, b'O']));
        assert!(bytes.ends_with(&[GS, 0x56, 0x41]));
    }
}