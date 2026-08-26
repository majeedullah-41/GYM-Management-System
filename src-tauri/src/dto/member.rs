use serde::{Deserialize, Serialize};

use crate::models::Member;

#[derive(Debug, Deserialize)]
pub struct CreateMemberRequest {
    pub full_name: String,
    pub father_name: Option<String>,
    pub phone: Option<String>,
    pub cnic: Option<String>,
    pub address: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMemberRequest {
    pub full_name: String,
    pub father_name: Option<String>,
    pub phone: Option<String>,
    pub cnic: Option<String>,
    pub address: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemberResponse {
    pub id: String,
    pub member_number: String,
    pub full_name: String,
    pub father_name: Option<String>,
    pub phone: Option<String>,
    pub cnic: Option<String>,
    pub address: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub notes: Option<String>,
    pub is_archived: bool,
    pub membership_plan_name: Option<String>,
    pub membership_start_date: Option<String>,
    pub membership_expiry_date: Option<String>,
    pub membership_status: Option<String>,
    pub outstanding_balance: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl MemberResponse {
    pub fn from_member(member: Member, membership: MembershipInfo) -> Self {
        Self {
            id: member.id,
            member_number: member.member_number,
            full_name: member.full_name,
            father_name: member.father_name,
            phone: member.phone,
            cnic: member.cnic,
            address: member.address,
            date_of_birth: member.date_of_birth,
            gender: member.gender,
            notes: member.notes,
            is_archived: member.is_archived,
            membership_plan_name: membership.plan_name,
            membership_start_date: membership.start_date,
            membership_expiry_date: membership.expiry_date,
            membership_status: membership.status,
            outstanding_balance: membership.outstanding_balance,
            created_at: member.created_at,
            updated_at: member.updated_at,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct MembershipInfo {
    pub plan_name: Option<String>,
    pub start_date: Option<String>,
    pub expiry_date: Option<String>,
    pub status: Option<String>,
    pub outstanding_balance: i64,
}
