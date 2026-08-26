/// Format an integer PKR amount with comma separators.
/// e.g., 2500 → "Rs. 2,500"
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
        assert_eq!(format_currency(125000), "Rs. 1,25,000");
    }
}
