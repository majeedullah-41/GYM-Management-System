use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Member {
    pub id: String,
    pub member_number: String,
    pub full_name: String,
    pub father_name: Option<String>,
    pub phone: Option<String>,
    pub cnic: Option<String>,
    pub address: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub photo_path: Option<String>,
    pub notes: Option<String>,
    pub admission_fee: Option<i64>,
    pub is_archived: bool,
    pub created_at: String,
    pub updated_at: String,
}
