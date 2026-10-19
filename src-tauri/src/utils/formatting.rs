/// Format an integer PKR amount with comma separators.
/// e.g., 2500 → "Rs. 2,500"
#[allow(dead_code)]
pub fn format_currency(amount: i64) -> String {
    let s = amount.to_string();
    let mut result = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.push(',');
        }
        result.push(c);
    }
    let formatted: String = result.chars().rev().collect();
    format!("Rs. {}", formatted)
}

/// Capitalizes the first letter of each whitespace-separated word after trimming.
/// Preserves existing casing of subsequent characters in each word.
pub fn capitalize_name(value: &str) -> String {
    let trimmed = value.trim();
    let mut out = String::with_capacity(trimmed.len());
    let mut start_of_word = true;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            start_of_word = true;
            out.push(ch);
        } else if start_of_word {
            for upper in ch.to_uppercase() {
                out.push(upper);
            }
            start_of_word = false;
        } else {
            out.push(ch);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_format_zero() {
        assert_eq!(format_currency(0), "Rs. 0");
    }

    #[test]
    fn should_format_small_amount() {
        assert_eq!(format_currency(500), "Rs. 500");
    }

    #[test]
    fn should_format_amount_with_commas() {
        assert_eq!(format_currency(2500), "Rs. 2,500");
    }

    #[test]
    fn should_format_large_amount() {
        assert_eq!(format_currency(125000), "Rs. 125,000");
    }

    #[test]
    fn should_capitalize_names() {
        assert_eq!(capitalize_name("ahmad khan"), "Ahmad Khan");
        assert_eq!(capitalize_name("  bilal traders "), "Bilal Traders");
        assert_eq!(capitalize_name("ON distributors"), "ON Distributors");
        assert_eq!(capitalize_name(""), "");
    }
}
