import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { formatCurrency } from "../../../lib/utils/format";
import type { PlanResponse } from "../../../lib/api/membership-plans";
import type { FormData, MemberFieldKey } from "../memberFields";
import { capitalizeName } from "../memberFields";
import { AddressAutocomplete } from "./AddressAutocomplete";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

interface MemberFormFieldsProps {
  visibleFields: Set<MemberFieldKey>;
  formData: FormData;
  errors: Record<string, string>;
  onChange: (key: MemberFieldKey, value: string) => void;
  plans: PlanResponse[];
  addressSuggestions?: string[];
  rows?: MemberFieldKey[][];
  disabled?: boolean;
}

export function MemberFormFields({
  visibleFields,
  formData,
  errors,
  onChange,
  plans,
  addressSuggestions = [],
  rows = DEFAULT_ROWS,
  disabled = false,
}: MemberFormFieldsProps) {
  const planOptions = [
    { value: "", label: "Select a plan (optional)..." },
    ...plans.map((p) => ({
      value: p.id,
      label: `${p.name} — ${formatCurrency(p.price)} (${p.duration_days} days)`,
    })),
  ];

  return (
    <div className="space-y-4">
      {rows.map((row, rowIndex) => {
        const visible = row.filter((key) => visibleFields.has(key));
        if (visible.length === 0) return null;
        const twoColumns = visible.length === 2;

        return (
          <div key={rowIndex} className={twoColumns ? "grid grid-cols-2 gap-4" : undefined}>
            {visible.map((key) => (
              <FieldControl
                key={key}
                fieldKey={key}
                formData={formData}
                errors={errors}
                onChange={onChange}
                plans={planOptions}
                addressSuggestions={addressSuggestions}
                disabled={disabled}
                fullWidth={!twoColumns}
              />
            ))}
          </div>
        );
      })}
      {formData.membership_plan_id && visibleFields.has("membership_plan_id") && (
        <Input
          label="Monthly Fee *"
          type="number"
          min={0}
          placeholder={formatCurrency(
            plans.find((p) => p.id === formData.membership_plan_id)?.price ?? 0,
          )}
          value={formData.monthly_fee}
          onChange={(e) => onChange("monthly_fee", e.target.value.replace(/\D/g, ""))}
          error={errors.monthly_fee}
          disabled={disabled}
          className="col-span-2"
        />
      )}
    </div>
  );
}

const DEFAULT_ROWS: MemberFieldKey[][] = [
  ["full_name"],
  ["father_name", "phone"],
  ["cnic", "gender"],
  ["date_of_birth"],
  ["admission_date"],
  ["blood_group"],
  ["address"],
  ["notes"],
  ["membership_plan_id"],
];

function FieldControl({
  fieldKey,
  formData,
  errors,
  onChange,
  plans,
  addressSuggestions,
  disabled,
  fullWidth,
}: {
  fieldKey: MemberFieldKey;
  formData: FormData;
  errors: Record<string, string>;
  onChange: (key: MemberFieldKey, value: string) => void;
  plans: { value: string; label: string }[];
  addressSuggestions: string[];
  disabled: boolean;
  fullWidth: boolean;
}) {
  const className = fullWidth ? "col-span-2" : undefined;
  const set = (value: string) => onChange(fieldKey, value);
  const error = errors[fieldKey];

  switch (fieldKey) {
    case "full_name":
      return (
        <Input
          label="Full Name *"
          placeholder="e.g. Ahmad Khan"
          value={formData.full_name}
          onChange={(e) => set(capitalizeName(e.target.value))}
          error={error}
          disabled={disabled}
          className={className}
        />
      );
    case "father_name":
      return (
        <Input
          label="Father Name"
          value={formData.father_name}
          onChange={(e) => set(capitalizeName(e.target.value))}
          disabled={disabled}
          className={className}
        />
      );
    case "phone":
      return (
        <Input
          label="Phone"
          placeholder="03xxxxxxxxx"
          type="tel"
          value={formData.phone}
          onChange={(e) => set(formatPhone(e.target.value))}
          error={error}
          disabled={disabled}
          className={className}
        />
      );
    case "cnic":
      return (
        <Input
          label="CNIC"
          placeholder="XXXXX-XXXXXXX-X"
          value={formData.cnic}
          onChange={(e) => set(formatCnic(e.target.value))}
          error={error}
          disabled={disabled}
          className={className}
        />
      );
    case "gender":
      return (
        <Select
          label="Gender"
          value={formData.gender}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          className={className}
          options={[
            { value: "", label: "Select" },
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
          ]}
        />
      );
    case "date_of_birth":
      return (
        <Input
          label="Date of Birth"
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          className={className}
        />
      );
    case "admission_date":
      return (
        <Input
          label="Admission Date"
          type="date"
          value={formData.admission_date}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          className={className}
        />
      );
    case "blood_group":
      return (
        <Select
          label="Blood Group"
          value={formData.blood_group}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          className={className}
          options={[
            { value: "", label: "Select blood group..." },
            ...BLOOD_GROUPS.map((group) => ({ value: group, label: group })),
          ]}
        />
      );
    case "address":
      return (
        <AddressAutocomplete
          label="Address"
          value={formData.address}
          onChange={set}
          suggestions={addressSuggestions}
          disabled={disabled}
          className={className}
        />
      );
    case "notes":
      return (
        <Input
          label="Notes"
          placeholder="Optional notes"
          value={formData.notes}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          className={className}
        />
      );
    case "membership_plan_id":
      return (
        <Select
          label="Membership Plan"
          value={formData.membership_plan_id}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          options={plans}
          className={className}
        />
      );
  }
}