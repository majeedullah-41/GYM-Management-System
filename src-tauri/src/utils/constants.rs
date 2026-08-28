pub const PAYMENT_METHODS: &[&str] = &["Cash", "Bank Transfer", "Card", "Other"];

pub fn is_valid_payment_method(method: &str) -> bool {
    PAYMENT_METHODS.contains(&method)
}
