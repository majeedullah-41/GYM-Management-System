/// Pure layout engine. Converts `Block`s into printable `Line`s using only
/// character columns, so it is fully deterministic and testable.
use crate::thermal::model::{Block, ItemRow, Line, LineKind, PrinterProfile};

/// Wrap text so no line exceeds `width` characters. Words are kept whole;
/// a single word longer than the width is hard-split at the width boundary.
pub fn wrap_text(text: &str, width: usize) -> Vec<String> {
    let width = width.max(1);
    let mut result: Vec<String> = Vec::new();
    let mut current = String::new();

    for word in text.split_whitespace() {
        let wlen = word.chars().count();
        if wlen > width {
            flush(&mut current, &mut result);
            let mut chars = word.chars();
            let mut chunk = String::new();
            for c in chars.by_ref() {
                chunk.push(c);
                if chunk.chars().count() == width {
                    result.push(std::mem::take(&mut chunk));
                }
            }
            if !chunk.is_empty() {
                result.push(chunk);
            }
            continue;
        }
        let room = current.chars().count();
        if !current.is_empty() && room + 1 + wlen > width {
            flush(&mut current, &mut result);
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
    }
    flush(&mut current, &mut result);

    if result.is_empty() {
        result.push(text.to_string());
    }
    result
}

fn flush(current: &mut String, result: &mut Vec<String>) {
    if !current.is_empty() {
        result.push(std::mem::take(current));
    }
}

/// Right-justify `text` within `width` columns.
pub fn right_justify(text: &str, width: usize) -> String {
    let width = width.saturating_sub(text.chars().count());
    format!("{}{text}", " ".repeat(width))
}

/// Center `text` within `width` columns, biasing the left pad by one column.
pub fn center(text: &str, width: usize) -> String {
    let extra = width.saturating_sub(text.chars().count());
    let left = extra / 2;
    let right = extra - left;
    format!("{}{text}{}", " ".repeat(left), " ".repeat(right))
}

/// Largest field that fits beside a right-aligned value, with one gap column.
pub fn left_column_width(width: usize, value_len: usize) -> usize {
    width.saturating_sub(value_len).saturating_sub(1)
}

pub fn render_item_row(row: &ItemRow, amount_text: &str, width: usize) -> Vec<Line> {
    let amount_w = amount_text.chars().count();
    let name_w = left_column_width(width, amount_w);
    let names = wrap_text(&row.name, name_w.max(1));

    let mut lines = Vec::new();
    for (i, name) in names.iter().enumerate() {
        if i == 0 {
            let pad = " ".repeat(name_w.saturating_sub(name.chars().count()));
            let text = format!("{name}{pad}{}", right_justify(amount_text, amount_w));
            lines.push(Line::text(text));
        } else {
            lines.push(Line::text(name.clone()));
        }
    }
    lines
}

pub fn render_field_row(label: &str, value: &str, width: usize) -> Vec<Line> {
    let width = width.max(1);
    if label.trim().is_empty() {
        return wrap_text(value, width)
            .into_iter()
            .map(Line::text)
            .collect();
    }
    let label_width = if width >= 36 { 11 } else { 10 };
    let prefix = format!("{label:<label_width$} : ");
    if prefix.chars().count() >= width {
        return wrap_text(&format!("{label} : {value}"), width)
            .into_iter()
            .map(Line::text)
            .collect();
    }
    let value_width = width - prefix.chars().count();
    wrap_text(value, value_width)
        .into_iter()
        .enumerate()
        .map(|(index, piece)| {
            if index == 0 {
                Line::text(format!("{prefix}{piece}"))
            } else {
                Line::text(format!("{}{piece}", " ".repeat(prefix.chars().count())))
            }
        })
        .collect()
}

pub fn render_divider(character: char, width: usize) -> Line {
    let mut line = Line::divider(character);
    for _ in 0..width {
        line.text.push(character);
    }
    line
}

pub fn render_centered(text: &str, bold: bool, width: usize) -> Vec<Line> {
    wrap_text(text, width)
        .into_iter()
        .map(|piece| {
            let line = Line::text(center(&piece, width)).centered();
            if bold {
                line.bold()
            } else {
                line
            }
        })
        .collect()
}

/// Convert a receipt document into print lines for the given column width.
pub fn render_document(blocks: &[Block], width: usize) -> Vec<Line> {
    let mut lines = Vec::new();
    for block in blocks {
        match block {
            Block::Header(pieces) => {
                for text in pieces {
                    lines.extend(render_centered(text, true, width));
                }
                lines.push(Line::blank());
            }
            Block::Centered(pieces) => {
                for text in pieces {
                    lines.extend(render_centered(text, false, width));
                }
            }
            Block::Row(label, value) => lines.extend(render_field_row(label, value, width)),
            Block::Divider => lines.push(render_divider('-', width)),
            Block::Items(rows) => {
                for row in rows {
                    let amount = crate::utils::formatting::format_currency(row.amount);
                    lines.extend(render_item_row(row, &amount, width));
                }
            }
            Block::Totals(rows) => {
                for row in rows {
                    let amount = crate::utils::formatting::format_currency(row.amount);
                    lines.extend(render_field_row(&row.label, &amount, width));
                }
            }
        }
    }
    lines
}

/// Total physical print lines including the cut feed margin (3 lines).
pub fn calculate_document_height(lines: &[Line]) -> usize {
    lines.iter().filter(|l| l.kind != LineKind::Cut).count() + 3
}

/// Deterministic ASCII preview of the rendered lines, for snapshots and logs.
pub fn render_lines_as_ascii(lines: &[Line]) -> String {
    let mut out = String::new();
    for line in lines {
        match line.kind {
            LineKind::Divider => {
                let ch = line.divider_char.unwrap_or('-');
                out.extend(std::iter::repeat(ch).take(line.text.chars().count()));
            }
            LineKind::Blank => {}
            LineKind::Cut => out.push_str("<CUT>\n"),
            LineKind::Text => out.push_str(&line.text),
        }
        out.push('\n');
    }
    if out.ends_with('\n') {
        out.pop();
    }
    out
}

/// Validate that no rendered line exceeds the printer column width.
pub fn lines_fit_profile(lines: &[Line], profile: &PrinterProfile) -> bool {
    lines
        .iter()
        .all(|l| l.text.chars().count() <= profile.characters_per_line)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wrap_text_keeps_lines_within_width() {
        let lines = wrap_text("one two three four five", 8);
        assert!(lines.iter().all(|l| l.chars().count() <= 8));
        assert_eq!(lines.join(" "), "one two three four five");
    }

    #[test]
    fn wrap_text_splits_single_long_word() {
        assert_eq!(wrap_text("abcdefghij", 4), vec!["abcd", "efgh", "ij"]);
    }

    #[test]
    fn wrap_text_empty_input_yields_input() {
        assert_eq!(wrap_text("", 10), vec![""]);
        assert_eq!(wrap_text("   ", 10), vec!["   "]);
    }

    #[test]
    fn wrap_text_no_leading_space_after_oversized_word() {
        let lines = wrap_text("abcdefghij next", 4);
        assert_eq!(lines, vec!["abcd", "efgh", "ij", "next"]);
    }

    #[test]
    fn width_one_is_minimum() {
        let lines = wrap_text("hello", 0);
        assert!(lines.iter().all(|l| l.chars().count() <= 1));
    }

    #[test]
    fn center_and_right_justify_respect_width() {
        assert_eq!(center("ab", 4), " ab ");
        assert_eq!(center("a", 4), " a  ");
        assert_eq!(right_justify("x", 4), "   x");
    }

    #[test]
    fn render_item_row_wraps_name_with_constant_amount() {
        let row = ItemRow {
            name: "A very long billing period name".to_string(),
            amount: 1000,
        };
        let lines = render_item_row(&row, "Rs. 1,000", 20);
        assert!(lines.len() > 1);
        assert!(lines.iter().all(|l| l.text.chars().count() <= 20));
        assert!(lines[0].text.ends_with("Rs. 1,000"));
    }

    #[test]
    fn render_field_row_keeps_value_right_aligned() {
        let lines = render_field_row("Date", "R01", 16);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].text.chars().count(), 16);
        assert!(lines[0].text.starts_with("Date"));
        assert!(lines[0].text.trim_end().ends_with(": R01"));
    }

    #[test]
    fn render_field_row_wraps_long_value() {
        let lines = render_field_row("Member", "A conspicuously long member name", 12);
        assert!(lines.len() > 1);
        assert!(lines.iter().all(|l| l.text.chars().count() <= 12));
    }

    #[test]
    fn render_divider_uses_character() {
        let line = render_divider('-', 8);
        assert_eq!(line.text.len(), 8);
        assert_eq!(line.kind, LineKind::Divider);
        assert_eq!(line.divider_char, Some('-'));
    }

    #[test]
    fn document_height_includes_cut_margin() {
        let lines = vec![Line::text("a".to_string()), Line::blank(), Line::cut()];
        assert_eq!(calculate_document_height(&lines), 5);
    }

    #[test]
    fn ascii_snapshot_is_stable() {
        let mut lines = render_centered("Fitness Zone", true, 16);
        lines.push(Line::blank());
        lines.push(render_divider('-', 16));
        lines.extend(render_field_row("Member", "Ali Khan", 16));
        lines.push(Line::cut());
        let snapshot = render_lines_as_ascii(&lines);
        assert_eq!(
            snapshot,
            "  Fitness Zone  \n\n----------------\nMember     : Ali\n             Kha\n             n\n<CUT>\n"
        );
    }

    #[test]
    fn lengths_fit_profile() {
        let profile = PrinterProfile::for_paper_width("58");
        let lines = vec![Line::text("short".to_string())];
        assert!(lines_fit_profile(&lines, &profile));
    }
}
