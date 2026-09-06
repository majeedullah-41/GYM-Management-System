# 12 — THERMAL PRINTING & RECEIPT OUTPUT

**Module:** Thermal Printing
**Priority:** P0 — Critical
**Status:** Planned
**Type:** System / Printing Module
**Technology:** Tauri + Rust + Frontend Receipt Renderer
**Supported Paper Widths:** 58mm / 80mm
**Configuration:** `Settings → Printing`
**Primary Use:** Payment Receipt Printing

---

# 1. Purpose

The Thermal Printing module is responsible for reliably producing and printing payment receipts.

The system MUST support exactly three primary receipt output modes:

```text
1. Print Window
2. Direct to Connected Printer
3. Save as PDF
```

The user selects the default behavior from:

```text
Settings
   ↓
Printing
```

The system must also support:

```text
58mm thermal paper
80mm thermal paper
```

The selected paper width controls receipt rendering across ALL three output methods.

The printing system must prevent:

* Blank receipts
* Content being cut from left/right edges
* Incorrect receipt width
* Excessive empty paper after receipt
* Printing an entire application page
* Sidebar/header appearing on receipts
* Receipt overflowing thermal paper
* Incorrect scaling
* Unnecessary page breaks
* Infinite paper feed
* Duplicate printing
* Missing receipt data
* Printing before receipt content is ready

---

# 2. Core Printing Principle

There must be ONE canonical receipt layout.

```text
                    PAYMENT
                       │
                       ▼
                Receipt Data
                       │
                       ▼
              Receipt Renderer
                       │
                Selected Width
                  58mm / 80mm
                       │
                       ▼
               Receipt Document
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
     Print Window   Direct Print    PDF
```

Do NOT create three unrelated receipt templates.

All three output methods must use the same receipt data and same receipt layout rules.

---

# 3. Settings → Printing

Add a dedicated section:

```text
Settings
   ↓
Printing
```

Recommended UI:

```text
┌─────────────────────────────────────────────────────┐
│ Printing                                            │
│                                                     │
│ Receipt Paper Size                                  │
│                                                     │
│ (●) 80mm                                            │
│ ( ) 58mm                                            │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ Receipt Output                                      │
│                                                     │
│ (●) Print Window                                    │
│ ( ) Direct to Connected Printer                     │
│ ( ) Save as PDF                                     │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ Direct Printer                                      │
│                                                     │
│ Printer                                             │
│ [ XP-80C Thermal Printer                       ▼ ]   │
│                                                     │
│ [ Refresh Printers ]                                │
│ [ Test Print ]                                      │
│                                                     │
│                         [ Save Changes ]            │
└─────────────────────────────────────────────────────┘
```

---

# 4. Paper Size Setting

The user must select:

```text
80mm
```

or:

```text
58mm
```

Only one may be active.

Recommended default:

```text
80mm
```

---

# 5. Paper Width Is Global

The selected receipt width must be used by:

```text
Print Window
Direct Printing
PDF
Receipt Preview
Test Print
Reprint Receipt
```

Do NOT maintain separate width settings for different output modes.

Example:

```text
Settings:
Paper = 58mm

        ↓

Print Window = 58mm
Direct Print = 58mm
PDF = 58mm
Preview = 58mm
```

---

# 6. Printable Width Is NOT Full Paper Width

This is extremely important.

A thermal printer may use:

```text
80mm paper
```

but the content must NOT assume that the entire 80mm is safely printable.

Likewise:

```text
58mm paper
```

does not mean content should touch both physical edges.

The renderer MUST reserve safe left and right margins.

Conceptually:

```text
┌───────────────────────────────┐
│ Paper                         │
│   ┌───────────────────────┐   │
│   │ SAFE PRINTABLE AREA   │   │
│   │                       │   │
│   │ Receipt Content       │   │
│   │                       │   │
│   └───────────────────────┘   │
└───────────────────────────────┘
```

Never place text directly against the physical paper edge.

---

# 7. Safe Margins

The renderer must define explicit safe margins for each paper size.

Conceptually:

```text
58mm Paper

| margin | printable content | margin |
```

and:

```text
80mm Paper

| margin | printable content | margin |
```

The exact printer-safe dimensions should be centralized in the printing configuration and verified using real printer testing.

Do NOT scatter arbitrary widths/margins across React components.

---

# 8. Critical No-Clipping Requirement

No receipt content may be cut from:

```text
Left edge
Right edge
Top
Bottom
```

Especially ensure these fields fit:

```text
Gym Name
Receipt Number
Member Name
Membership Plan
Dates
Amounts
Payment Method
Footer
```

Long text must:

```text
Wrap
```

rather than:

```text
Overflow
Clip
Disappear
```

---

# 9. Receipt Must Be Simple

The thermal receipt must intentionally remain simple.

Do NOT design it like:

```text
Dashboard
Invoice software
A4 report
Website
Marketing flyer
```

Thermal receipts need:

```text
Black text
White background
Clear typography
Simple separators
Strong amount
Compact spacing
No unnecessary decoration
```

---

# 10. Canonical Receipt Design

The receipt should follow this style:

```text
          SWAT FITNESS CENTER

            PAYMENT RECEIPT
--------------------------------

Receipt #: RCPT-000582
Date:      27/08/2026

Member:    Ali Khan
Member ID: MEM-00124

Plan:      Monthly Membership

Period:
27/08/2026 - 26/09/2026

Amount:    Rs. 2,000
Method:    Cash

--------------------------------

      Thank you for your payment!
```

This is the baseline receipt style.

Keep it professional, compact, and easy to read.

---

# 11. Receipt Content

Recommended fields:

```text
Gym Name

PAYMENT RECEIPT

Receipt Number
Payment Date

Member Name
Member ID

Membership Plan

Membership Period

Amount
Payment Method

Optional Note

Footer
```

Optional fields configured through Settings may include:

```text
Gym Phone
Gym Address
Gym Logo
```

However, thermal printing must prioritize readability and reliability.

---

# 12. Receipt Data Source

Receipts must be generated from authoritative backend payment/receipt data.

Never build a receipt from random frontend text currently visible on screen.

Correct:

```text
Payment ID
    ↓
Rust Backend
    ↓
Payment + Receipt Data
    ↓
Receipt DTO
    ↓
Receipt Renderer
```

---

# 13. Receipt DTO

Conceptually:

```text
ReceiptData {
    receipt_number
    payment_date

    gym_name
    gym_phone
    gym_address

    member_name
    member_id

    plan_name

    period_start
    period_end

    amount
    payment_method

    note
    footer
}
```

Only required presentation data should be sent to the renderer.

---

# 14. Receipt Must Never Be Blank

A print operation MUST NOT begin until receipt content has successfully rendered.

Required flow:

```text
Request Print
     ↓
Load Receipt Data
     ↓
Data Available?
     │
     ├── NO → Show Error
     │
     └── YES
          ↓
Render Receipt
          ↓
Receipt Rendered?
          │
          ├── NO → Stop
          │
          └── YES
               ↓
Validate Printable Content
               ↓
Print
```

Never:

```text
Open print
     ↓
Load receipt later
```

This can produce blank printouts.

---

# 15. Receipt Render Readiness

Before printing, verify:

```text
Receipt container exists
Receipt data exists
Receipt number exists
Member exists
Amount exists
DOM/render output is ready
```

If required data is missing:

```text
Unable to print receipt.

Receipt information could not be loaded.
```

Do NOT send an empty document to the printer.

---

# 16. Output Mode 1 — Print Window

Setting:

```text
Receipt Output:
Print Window
```

Workflow:

```text
Click Print Receipt
      ↓
Load Receipt Data
      ↓
Render Receipt
      ↓
Apply 58mm / 80mm Print CSS
      ↓
Open System Print Window
      ↓
User Selects Printer
      ↓
Print
```

This is the most compatible printing mode.

---

# 17. Print Window Behavior

When the print window opens, ONLY the receipt should be printable.

Never print:

```text
Sidebar
Navigation
Dashboard
Buttons
Modal background
Application title bar content
Payment page
```

Print output must contain only:

```text
Receipt
```

---

# 18. Print-Specific Rendering

The application must have dedicated print styling.

Conceptually:

```text
Normal UI
    ↓
Print Mode
    ↓
Hide Application UI
    ↓
Show Receipt Only
```

Do NOT depend on normal application page CSS for printing.

---

# 19. Print Window Paper Size

If selected:

```text
80mm
```

print CSS/document must target the 80mm receipt layout.

If selected:

```text
58mm
```

print CSS/document must target the 58mm receipt layout.

Do NOT render an A4 receipt and expect the print dialog to correctly shrink it.

---

# 20. Print Window Scaling

Receipt should print at:

```text
100% / Actual Size
```

as closely as supported by the selected print workflow.

Avoid designs that require:

```text
Fit to page
Shrink to fit
A4 scaling
```

The receipt itself must already be thermal-paper sized.

---

# 21. Output Mode 2 — Direct to Connected Printer

Setting:

```text
Receipt Output:
Direct to Connected Printer
```

Workflow:

```text
Click Print Receipt
      ↓
Load Receipt Data
      ↓
Validate Receipt
      ↓
Get Configured Printer
      ↓
Render for Selected Paper Width
      ↓
Send Print Job
      ↓
Printer Prints Exact Receipt
      ↓
Feed Only Required Ending Space
      ↓
Stop
```

The system print dialog should NOT appear in direct mode.

---

# 22. Connected Printer Selection

Settings should list available printers.

Example:

```text
Printer

[ XP-80C Thermal Printer ▼ ]
```

Actions:

```text
[ Refresh Printers ]
[ Test Print ]
```

The selected printer should be persisted.

---

# 23. Missing Direct Printer

If direct mode is selected but the configured printer is unavailable:

```text
Printer Not Available

The configured thermal printer could not be found.

[ Retry ]
[ Use Print Window ]
[ Cancel ]
```

Do not silently discard the print job.

---

# 24. Direct Printing Must Be Backend Controlled

Direct printer communication should be implemented through the Rust/Tauri side where practical.

Architecture:

```text
React
   │
   │ print_receipt(payment_id)
   ▼
Tauri Command
   │
   ▼
Printing Service
   │
   ├── Load Receipt
   ├── Validate Receipt
   ├── Read Print Settings
   ├── Resolve Printer
   ├── Render/Encode Job
   └── Send to Printer
```

Do not make React responsible for low-level printer communication.

---

# 25. Printer Abstraction

Create a printing abstraction.

Conceptually:

```text
PrinterService
    │
    ├── list_printers()
    ├── printer_exists()
    ├── print_receipt()
    └── test_print()
```

Do not place operating-system printer code directly inside payment business logic.

---

# 26. Thermal Printer Protocol

Direct thermal printing may require platform/printer-specific support.

If ESC/POS-compatible direct printing is implemented, isolate it behind the printing layer.

Conceptually:

```text
ReceiptData
     ↓
Thermal Renderer
     ↓
Printer Commands
     ↓
Connected Printer
```

Do NOT mix ESC/POS byte generation with:

```text
Payments Service
Receipt Repository
React Components
```

---

# 27. Printer Capability Differences

Not every printer behaves identically.

The implementation must account for:

```text
58mm vs 80mm
Different printable widths
Different drivers
Different cutter support
Different character support
USB printer differences
Windows spooler behavior
```

Do not assume every thermal printer supports every command.

---

# 28. Receipt Ending — CRITICAL

After the final receipt line, the printer must feed ONLY enough paper to make the receipt readable/tearable.

Then the print job MUST END.

Correct:

```text
Thank you for your payment!

<small ending feed>

END PRINT JOB
```

Incorrect:

```text
Thank you for your payment!

















<large blank paper>
```

---

# 29. No Endless Paper Feed

The printing implementation must NEVER:

```text
Use fixed A4 page height
Generate huge blank page
Add excessive bottom padding
Add unnecessary page break
Continue feeding after content
```

The physical receipt should end shortly after the footer.

---

# 30. Dynamic Receipt Height

Receipt height must be based on content.

Conceptually:

```text
Receipt Height
=
Actual Content Height
+
Small Safe Ending Space
```

NOT:

```text
Receipt Height
=
A4
```

and NOT:

```text
Receipt Height
=
Arbitrary 500mm
```

---

# 31. End-of-Receipt Behavior

Required sequence:

```text
Last Receipt Content
       ↓
Footer
       ↓
Small Bottom Spacing
       ↓
Optional Tear/Cut Feed
       ↓
Optional Cutter Command
       ↓
END JOB
```

Once this sequence completes:

```text
Printer must stop feeding paper.
```

---

# 32. Auto Cutter

If the selected printer supports automatic cutting, future/direct printing may support:

```text
Auto Cut Receipt
```

Optional setting:

```text
☑ Cut paper after printing
```

Only send cutter commands when supported.

For printers without a cutter:

```text
Feed enough paper for manual tear
       ↓
Stop
```

---

# 33. Output Mode 3 — Save as PDF

Setting:

```text
Receipt Output:
Save as PDF
```

Workflow:

```text
Click Print Receipt
      ↓
Load Receipt Data
      ↓
Render Receipt
      ↓
Apply Selected 58mm / 80mm Width
      ↓
Generate PDF
      ↓
Choose Save Location
      ↓
Save
```

The generated PDF must use thermal receipt dimensions.

---

# 34. PDF Must NOT Be A4

If paper setting is:

```text
80mm
```

PDF width should correspond to the 80mm receipt layout.

If:

```text
58mm
```

PDF width should correspond to the 58mm receipt layout.

Do NOT generate:

```text
A4 page
with tiny receipt in corner
```

---

# 35. PDF Height

PDF height should follow receipt content.

Conceptually:

```text
PDF Width = Selected Thermal Width

PDF Height = Receipt Content Height + Safe Bottom Margin
```

Avoid unnecessary blank space after the receipt.

---

# 36. PDF Content

PDF must visually match the printed receipt as closely as practical.

Same:

```text
Gym Name
Receipt Number
Member
Plan
Dates
Amount
Method
Footer
```

Same ordering.

Same general typography.

Same paper-width constraints.

---

# 37. One Receipt Renderer

This rule is mandatory:

```text
                  ReceiptData
                       │
                       ▼
                Receipt Renderer
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
           Window    Direct     PDF
```

Do NOT create:

```text
PrintWindowReceipt.tsx
DirectPrinterReceiptDifferentLogic.rs
PdfReceiptDifferentTemplate.tsx
```

with unrelated layouts/business rules.

Platform-specific output adapters may differ, but receipt content/layout rules must remain centralized.

---

# 38. Receipt Layout Tokens

Centralize receipt dimensions.

Conceptually:

```text
ThermalPaper {
    width
    safe_left_margin
    safe_right_margin
    top_margin
    bottom_margin
    font_sizes
    line_spacing
}
```

Profiles:

```text
THERMAL_58MM
THERMAL_80MM
```

---

# 39. 58mm Profile

The 58mm profile should:

```text
Use narrower content width
Use compact typography
Wrap long values
Avoid wide two-column layouts
Keep safe margins
```

Example:

```text
       SWAT FITNESS CENTER

         PAYMENT RECEIPT
----------------------------

Receipt:
RCPT-000582

Date:
27/08/2026

Member:
Ali Khan

Member ID:
MEM-00124

Plan:
Monthly Membership

Period:
27/08/2026 - 26/09/2026

Amount:
Rs. 2,000

Method:
Cash

----------------------------

 Thank you for your payment!
```

If a two-column row would become cramped, stack the label and value.

Readability is more important than forcing the 80mm layout onto 58mm paper.

---

# 40. 80mm Profile

80mm may use slightly more horizontal space.

Example:

```text
          SWAT FITNESS CENTER

            PAYMENT RECEIPT
--------------------------------

Receipt #: RCPT-000582
Date:      27/08/2026

Member:    Ali Khan
Member ID: MEM-00124

Plan:      Monthly Membership

Period:
27/08/2026 - 26/09/2026

Amount:    Rs. 2,000
Method:    Cash

--------------------------------

      Thank you for your payment!
```

---

# 41. Long Member Names

Example:

```text
Muhammad Abdul Rehman Khan
```

must:

```text
Wrap
```

Never:

```text
Muhammad Abdul Rehm...
```

unless truncation is explicitly required.

Receipt information should remain complete.

---

# 42. Long Gym Names

Long gym names should:

```text
Center
Wrap
Remain inside printable area
```

Do not reduce the font to unreadable sizes merely to force one line.

---

# 43. Long Plan Names

Example:

```text
Premium Three Month Membership
```

must wrap safely.

No horizontal overflow is permitted.

---

# 44. Long Notes

Notes are optional.

If included:

```text
Notes:
Payment received with special
monthly discount approved by
management.
```

Notes must wrap within the printable width.

---

# 45. Currency Formatting

Use the global Settings currency.

Example:

```text
Rs. 2,000
```

Do not hard-code currency separately inside the printing module.

---

# 46. Date Formatting

Use global Settings date format.

Example:

```text
27/08/2026
```

Receipt rendering must use the same centralized formatting rules as the rest of the application.

---

# 47. Typography

Thermal receipt typography should prioritize readability.

Recommended hierarchy:

```text
Gym Name
    Bold

PAYMENT RECEIPT
    Bold

Labels
    Normal / Medium

Amount
    Bold / emphasized

Footer
    Normal
```

Avoid overly thin fonts.

Thermal printers can render thin typography poorly.

---

# 48. Font Compatibility

Do not rely on unusual web fonts being available to a direct thermal printer.

For HTML/PDF rendering, use reliable fonts.

For direct printer text mode, use printer-compatible character handling.

Receipt functionality must not fail because a decorative font is unavailable.

---

# 49. Logo

Logo is optional.

If logo printing is enabled:

```text
Gym Logo
```

must:

```text
Fit within printable width
Maintain aspect ratio
Be converted appropriately for thermal printing
Not push receipt outside paper width
```

If logo processing fails, the system should preferably still be able to print the text receipt.

Text receipt reliability is more important than logo rendering.

---

# 50. Print Receipt from Payment Success

After receiving payment:

```text
✓ Payment Received

Ali Khan
Rs. 2,000
Monthly Membership

Receipt #RCPT-000582

[ Print Receipt ] [ Done ]
```

Clicking:

```text
[ Print Receipt ]
```

must read the configured output mode.

---

# 51. Output Dispatch

Conceptually:

```text
print_receipt(receipt_id)
        │
        ▼
Load Print Settings
        │
        ├── paper = 58mm / 80mm
        │
        └── mode
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
     WINDOW DIRECT PDF
```

The user should not have to choose the mode every time unless they explicitly override it.

---

# 52. Optional Per-Print Override

The receipt success screen may optionally provide:

```text
Print ▼
```

with:

```text
Print Using Default
Print Window
Direct Print
Save as PDF
```

But the normal primary button should use the Settings default.

Do not make normal receipt printing unnecessarily complicated.

---

# 53. Reprint Receipt

Existing receipts must support:

```text
[ Reprint ]
```

Reprinting must:

```text
Load existing receipt/payment data
       ↓
Use current print settings
       ↓
Render receipt
       ↓
Print
```

Reprinting must NOT:

```text
Create another payment
Generate another receipt number
Extend membership
Add finance income
```

---

# 54. Reprint Identity

A reprinted receipt retains:

```text
Original Receipt Number
Original Payment Date
Original Member
Original Amount
Original Payment Method
Original Membership Period
```

It is the same receipt being printed again.

---

# 55. Test Print

Settings must provide:

```text
[ Test Print ]
```

Test print should use representative data.

Example:

```text
          SWAT FITNESS CENTER

              TEST PRINT
--------------------------------

Printer connection successful.

Paper Size: 80mm

--------------------------------

          Printing is ready.
```

For 58mm, use the 58mm layout.

---

# 56. Test Print Must End Correctly

The test print must also verify:

```text
Correct width
No clipped edges
No blank receipt
Correct ending feed
Printer stops after receipt
```

Test Print is not just a connectivity test.

It is also a layout/feeding sanity test.

---

# 57. Print Preview

For Print Window and PDF flows, preview should accurately represent:

```text
Selected width
Safe margins
Wrapping
Receipt height
```

Do not show an 80mm preview and then print 58mm.

---

# 58. Direct Printing Failure

If a direct print fails:

```text
Receipt Could Not Be Printed

The payment was saved successfully,
but the receipt could not be printed.

[ Retry Print ]
[ Use Print Window ]
[ Save as PDF ]
[ Close ]
```

IMPORTANT:

Printing failure must NOT roll back an already successful payment.

---

# 59. Payment and Printing Transaction Boundary

Payment persistence and physical printing are separate operations.

Correct:

```text
Receive Payment
      ↓
Save Payment Successfully
      ↓
Generate Receipt Record
      ↓
COMMIT
      ↓
Attempt Print
```

If printing fails:

```text
Payment remains valid
Receipt remains valid
User can reprint
```

Never undo financial data because a printer ran out of paper.

---

# 60. Duplicate Print Protection

While a print job is being submitted:

```text
[ Printing... ]
```

disable repeated clicks.

This prevents accidental:

```text
Receipt
Receipt
Receipt
Receipt
```

from one rapid series of clicks.

After the job completes/fails, printing may be retried normally.

---

# 61. Blank Receipt Prevention

Before every output operation verify:

```text
receipt_data != null
receipt_number != empty
member_name != empty
amount is valid
rendered_content != empty
```

For DOM/HTML printing, wait until the receipt has actually rendered.

For direct printing, ensure the generated printer payload contains receipt content before submitting it.

For PDF, ensure rendered receipt content exists before creating/saving the file.

---

# 62. Print Job State

Conceptual:

```text
PrintJobState {
    idle
    preparing
    ready
    printing
    success
    failed
}
```

Do not trigger printing while state is:

```text
preparing
```

---

# 63. Printing Service

Recommended architecture:

```text
printing/
├── domain/
│   ├── print_settings.rs
│   ├── paper_size.rs
│   ├── output_mode.rs
│   ├── printer.rs
│   └── print_error.rs
│
├── services/
│   ├── printing_service.rs
│   └── printer_service.rs
│
├── renderers/
│   ├── receipt_renderer.rs
│   ├── pdf_renderer.rs
│   └── thermal_renderer.rs
│
└── commands/
    └── printing_commands.rs
```

Adapt names to the existing architecture rather than creating inconsistent project conventions.

---

# 64. Output Mode Domain Type

Do not use arbitrary strings throughout the code.

Conceptually:

```text
PrintOutputMode {
    PrintWindow,
    DirectPrinter,
    SavePdf
}
```

---

# 65. Paper Size Domain Type

Conceptually:

```text
ThermalPaperSize {
    Mm58,
    Mm80
}
```

Avoid:

```text
"small"
"normal"
"thermal1"
```

Use explicit names.

---

# 66. Print Settings Model

Conceptually:

```text
PrintSettings {
    paper_size
    output_mode
    printer_name
    auto_cut
}
```

Optional future fields may be added only when needed.

---

# 67. Settings Persistence

Printing settings must survive application restart.

Example:

```text
Paper:
80mm

Output:
Direct Printer

Printer:
XP-80C
```

Close application.

Reopen.

Expected:

```text
Same settings remain.
```

---

# 68. Printer Name Persistence

If selected printer disappears:

```text
Configured printer:
XP-80C

Status:
Unavailable
```

Do not automatically choose a random printer without informing the user.

---

# 69. Default Printer

For direct mode, a printer must be explicitly resolved.

Possible policy:

```text
Configured Printer
      ↓
Available?
      │
  ┌───┴───┐
  ▼       ▼
 YES      NO
  │       │
Print   Error/Fallback Options
```

Do not silently print to an unexpected office printer.

---

# 70. Print Window Does Not Require Configured Direct Printer

When output mode is:

```text
Print Window
```

the application does not need a stored direct thermal printer.

The operating system print dialog handles printer selection.

---

# 71. Save PDF Does Not Require Printer

When output mode is:

```text
Save as PDF
```

no physical printer should be required.

---

# 72. Receipt CSS Isolation

If HTML/CSS is used for Print Window/PDF rendering, receipt styles must be isolated.

Avoid global application CSS causing:

```text
Unexpected margins
Dark background
Button styles
Grid widths
Overflow
Animations
Transforms
Scaling
```

The receipt renderer should have deterministic print styles.

---

# 73. Dark Mode

Receipt output must remain:

```text
White background
Black/dark text
```

regardless of application theme.

If app theme is:

```text
Dark
```

the printed receipt must NOT become:

```text
Black background
White text
```

Thermal receipt printing is theme-independent.

---

# 74. Hidden Elements

Print output must hide:

```text
Buttons
Icons that are UI-only
Close controls
Scrollbars
Navigation
Modal overlays
Tooltips
Form controls
```

Only receipt content should remain.

---

# 75. No Scroll Container Printing

Do not print a receipt while it is trapped inside a fixed-height scroll container.

Example of dangerous styling:

```text
height: 400px
overflow: auto
```

This can clip receipt content.

Print receipt container must expand naturally to its content height.

---

# 76. Width Overflow Testing

Test at minimum:

```text
Very long gym name
Very long member name
Long plan name
Long receipt number
Large amount
Long payment method
Long note
```

At both:

```text
58mm
80mm
```

Nothing may overflow horizontally.

---

# 77. Receipt Height Testing

Test:

```text
Minimum receipt content
Maximum normal receipt content
Receipt with logo
Receipt without logo
Receipt with address
Receipt with note
Receipt without note
```

The printer must stop shortly after actual content in every case.

---

# 78. Automated Tests — Paper Settings

Test:

```text
paper_size = 58mm
```

Expected:

```text
58mm rendering profile used.
```

Test:

```text
paper_size = 80mm
```

Expected:

```text
80mm rendering profile used.
```

---

# 79. Automated Tests — Output Mode

Test:

```text
PrintWindow
```

Expected:

```text
Print Window adapter selected.
```

Test:

```text
DirectPrinter
```

Expected:

```text
Direct printer adapter selected.
```

Test:

```text
SavePdf
```

Expected:

```text
PDF adapter selected.
```

---

# 80. Automated Tests — Receipt Data

Given valid payment:

```text
RCPT-000582
Ali Khan
Rs. 2,000
```

Expected renderer output contains all three values.

Receipt output must not be empty.

---

# 81. Automated Tests — Empty Receipt

Given invalid/missing receipt data:

Expected:

```text
Printing rejected.
```

No printer job should be created.

No blank PDF should be generated.

No blank print window should be intentionally dispatched.

---

# 82. Automated Tests — Long Text

Given:

```text
Muhammad Abdul Rehman Khan
Premium Three Month Membership
```

Expected:

```text
Text wraps within selected paper width.
```

No horizontal clipping.

---

# 83. Automated Tests — Reprint

Reprint:

```text
RCPT-000582
```

Expected:

```text
Same receipt number
Same amount
Same original payment
```

and:

```text
No new payment
No membership extension
No finance transaction
```

---

# 84. Automated Tests — Printing Failure

Given:

```text
Payment already committed
Printer unavailable
```

Expected:

```text
Payment remains saved
Receipt remains saved
Print error displayed
Reprint available
```

---

# 85. Automated Tests — Direct Printer Missing

Configured:

```text
XP-80C
```

but printer is unavailable.

Expected:

```text
Do not silently print elsewhere.
Show printer unavailable state.
```

---

# 86. Automated Tests — Settings Persistence

Save:

```text
Paper = 58mm
Mode = DirectPrinter
Printer = XP-58
```

Restart.

Expected:

```text
Settings preserved.
```

---

# 87. Manual Physical Printer Tests

Automated tests are NOT enough for thermal printing.

Before release, physically test:

```text
[ ] Real 58mm printer
[ ] Real 80mm printer
[ ] Print Window mode
[ ] Direct Printer mode
[ ] PDF mode
[ ] Test Print
[ ] Payment receipt
[ ] Reprint
```

---

# 88. Physical 58mm Acceptance Test

Verify:

```text
[ ] Receipt physically fits 58mm paper
[ ] Left edge is not cut
[ ] Right edge is not cut
[ ] Text is readable
[ ] Long values wrap
[ ] Receipt is not blank
[ ] No excessive bottom paper
[ ] Printer stops after receipt
[ ] Tear position is usable
```

---

# 89. Physical 80mm Acceptance Test

Verify:

```text
[ ] Receipt physically fits 80mm paper
[ ] Left edge is not cut
[ ] Right edge is not cut
[ ] Text is readable
[ ] Receipt is centered appropriately
[ ] Receipt is not blank
[ ] No excessive bottom paper
[ ] Printer stops after receipt
[ ] Tear/cut position is usable
```

---

# 90. Print Window Acceptance Test

Verify:

```text
[ ] Only receipt appears
[ ] Application UI is hidden
[ ] Correct thermal width is used
[ ] No A4-specific layout
[ ] No clipped edges
[ ] No blank first page
[ ] No blank second page
[ ] Receipt content is complete
```

---

# 91. PDF Acceptance Test

Verify:

```text
[ ] PDF opens successfully
[ ] Correct 58mm/80mm width
[ ] Receipt content visible
[ ] No blank PDF
[ ] No A4 page
[ ] No clipped text
[ ] No excessive blank bottom area
[ ] Receipt matches print layout
```

---

# 92. Direct Printing Acceptance Test

Verify:

```text
[ ] Correct printer receives job
[ ] Print dialog does not appear
[ ] Receipt is not blank
[ ] Correct paper width is respected
[ ] Text is not clipped
[ ] Receipt finishes correctly
[ ] Small ending feed only
[ ] Printer stops after receipt
[ ] Cutter works only if supported/enabled
```

---

# 93. Common Bugs That MUST Be Prevented

## Bug 1 — Blank Receipt

Cause:

```text
Printing before receipt renders
```

Prevent by:

```text
Load
Render
Validate
Then Print
```

---

## Bug 2 — Receipt Cut on Right Side

Cause:

```text
Using full physical width
Ignoring printer margins
Overflowing rows
```

Prevent by:

```text
Safe printable width
Safe margins
Text wrapping
```

---

## Bug 3 — Huge Blank Paper After Receipt

Cause:

```text
A4 page height
Fixed large container
Large bottom margin
Incorrect feed command
```

Prevent by:

```text
Dynamic content height
Small ending feed
Explicit job termination
```

---

## Bug 4 — Entire App Gets Printed

Cause:

```text
Printing current application window without print isolation
```

Prevent by:

```text
Dedicated receipt print document/styles
```

---

## Bug 5 — Wrong Paper Size

Cause:

```text
Ignoring Settings
```

Prevent by:

```text
Printing Service always loads active PrintSettings.
```

---

## Bug 6 — Duplicate Receipt Print

Cause:

```text
Repeated click while print job is processing
```

Prevent by:

```text
Disable Print button while submitting job.
```

---

## Bug 7 — Payment Lost Because Printer Failed

Cause:

```text
Treating printing as part of financial database transaction
```

Prevent by:

```text
Commit payment first.
Print second.
```

---

# 94. Error Messages

Use clear errors.

Examples:

```text
Printer unavailable.
```

```text
Receipt could not be loaded.
```

```text
Receipt could not be printed.
```

```text
PDF could not be created.
```

```text
No printer is configured for direct printing.
```

Do not show raw operating-system or Rust errors directly to gym staff.

Detailed technical errors may be logged safely.

---

# 95. Settings Integration

Update:

```text
09-SETTINGS.md
```

to include:

```text
Settings
├── General
├── Gym Information
├── Receipts
├── Printing
├── Reports
├── Appearance
├── User Information
├── License
└── Data & Backup
```

---

# 96. Printing Settings — Required Fields

The Printing section MUST contain:

```text
Paper Size
    ○ 80mm
    ○ 58mm

Receipt Output
    ○ Print Window
    ○ Direct to Connected Printer
    ○ Save as PDF
```

When Direct Printing is selected:

```text
Printer
[ Select Connected Printer ▼ ]

[ Refresh Printers ]
[ Test Print ]
```

---

# 97. Default Settings

Recommended defaults:

```text
Paper Size:
80mm

Receipt Output:
Print Window

Direct Printer:
None

Auto Cut:
Off unless explicitly configured/supported
```

Print Window is the safest initial default because it works with normal operating-system printer drivers.

---

# 98. Backend Rules

The Rust printing layer MUST:

```text
[ ] Load print settings
[ ] Validate paper size
[ ] Validate output mode
[ ] Load authoritative receipt data
[ ] Reject empty receipt data
[ ] Resolve direct printer when required
[ ] Return controlled errors
[ ] Prevent accidental duplicate submissions where practical
[ ] Keep printer code separate from payment logic
```

---

# 99. Frontend Rules

The frontend MUST:

```text
[ ] Display Printing settings
[ ] Display 58mm/80mm choice
[ ] Display three output modes
[ ] Show printer selector only when relevant
[ ] Show printing state
[ ] Disable repeated print click during submission
[ ] Render receipt safely for Print Window
[ ] Never print application chrome
[ ] Respect light receipt styling regardless of theme
[ ] Show clear print failures
```

---

# 100. AI CODING AGENT — CRITICAL INSTRUCTIONS

Before changing ANY receipt printing code, the AI agent MUST read:

```text
ARCHITECTURE.md
DATABASE-SPECIFICATION.md
UI-UX-SYSTEM.md
04-PAYMENTS.md
07-RECEIPTS.md
09-SETTINGS.md
12-THERMAL-PRINTING.md
```

The agent MUST inspect existing printing code before replacing it.

---

# 101. AI Agent MUST

The AI coding agent MUST:

```text
[ ] Maintain one canonical receipt layout
[ ] Support exactly 58mm and 80mm paper profiles initially
[ ] Respect selected Settings paper size
[ ] Support Print Window
[ ] Support Direct Printer
[ ] Support Save as PDF
[ ] Use safe printable margins
[ ] Prevent horizontal clipping
[ ] Wrap long content
[ ] Prevent blank receipts
[ ] Wait for receipt data/render readiness
[ ] Use dynamic receipt height
[ ] Stop the print job after receipt content
[ ] Use only a small ending feed
[ ] Keep payment persistence independent from printer success
[ ] Allow failed receipts to be reprinted
[ ] Keep original receipt number during reprint
[ ] Add automated tests
[ ] Physically verify real thermal printing before release
```

---

# 102. AI Agent MUST NOT

The AI coding agent MUST NOT:

```text
[ ] Print an A4 page for thermal receipts
[ ] Use A4 as the receipt's hidden page size
[ ] Use full 58mm/80mm width without safe margins
[ ] Allow receipt content to touch paper edges
[ ] Print before receipt data is ready
[ ] Print an empty receipt container
[ ] Print the entire application page
[ ] Print sidebar/navigation/buttons
[ ] Use a fixed huge receipt height
[ ] Add excessive bottom padding
[ ] Feed paper indefinitely
[ ] Add unnecessary blank pages
[ ] Maintain separate business data for each output mode
[ ] Create a new payment when reprinting
[ ] Extend membership when reprinting
[ ] Add finance income when reprinting
[ ] Roll back payment because printer failed
[ ] Silently switch direct printers
[ ] Ignore selected paper width
[ ] Trust frontend receipt data over authoritative payment data
[ ] Mix printer-driver code with Payment Service
[ ] Skip physical printer testing
```

---

# 103. Implementation Order

Implement in this order:

1. Define `ThermalPaperSize`
2. Define `PrintOutputMode`
3. Define `PrintSettings`
4. Add Printing settings persistence
5. Build Settings → Printing UI
6. Implement 58mm layout profile
7. Implement 80mm layout profile
8. Define canonical `ReceiptData`
9. Build canonical receipt renderer
10. Add long-text wrapping
11. Add safe margins
12. Add dynamic receipt height
13. Implement receipt readiness validation
14. Implement Print Window
15. Test Print Window at 58mm
16. Test Print Window at 80mm
17. Implement PDF output
18. Test PDF at 58mm
19. Test PDF at 80mm
20. Implement printer enumeration
21. Implement configured printer persistence
22. Implement Direct Printer adapter
23. Implement direct 58mm output
24. Implement direct 80mm output
25. Implement controlled ending feed
26. Implement optional cutter support if needed
27. Implement Test Print
28. Implement Payment Success → Print
29. Implement Receipt History → Reprint
30. Add duplicate-print protection
31. Add printing failure handling
32. Add unit tests
33. Add integration tests
34. Test physical 58mm printer
35. Test physical 80mm printer
36. Fix clipping/driver-specific issues
37. Verify printer stops exactly after required ending feed
38. Perform final regression testing

---

# 104. Definition of Done

Thermal printing is NOT complete until:

```text
[ ] 58mm setting works
[ ] 80mm setting works
[ ] Print Window works
[ ] Direct Printing works
[ ] Save as PDF works
[ ] Printer can be selected
[ ] Printer selection persists
[ ] Test Print works
[ ] Receipt is never blank
[ ] Receipt data is complete
[ ] Left edge is not cut
[ ] Right edge is not cut
[ ] Long text wraps
[ ] 58mm receipt fits correctly
[ ] 80mm receipt fits correctly
[ ] PDF uses thermal dimensions
[ ] Print Window prints receipt only
[ ] Direct print uses configured printer
[ ] Missing printer is handled
[ ] Reprint works
[ ] Reprint does not create financial records
[ ] Printer failure does not undo payment
[ ] Receipt has no unnecessary blank page
[ ] Receipt has no excessive trailing paper
[ ] Printer stops after receipt
[ ] Cutter behavior is correct where supported
[ ] Automated tests pass
[ ] Integration tests pass
[ ] Physical 58mm test passes
[ ] Physical 80mm test passes
```

---

# 105. Golden Receipt Flow

```text
                    PAYMENT SAVED
                         │
                         ▼
                   RECEIPT RECORD
                         │
                         ▼
                  LOAD RECEIPT DATA
                         │
                         ▼
                    DATA VALID?
                         │
                    ┌────┴────┐
                    ▼         ▼
                   YES        NO
                    │         │
                    ▼         ▼
               LOAD SETTINGS ERROR
                    │
          ┌─────────┴─────────┐
          │                   │
        58mm                 80mm
          │                   │
          └─────────┬─────────┘
                    ▼
              RENDER RECEIPT
                    │
                    ▼
             CONTENT READY?
                    │
               ┌────┴────┐
               ▼         ▼
              YES        NO
               │         │
               ▼         ▼
          OUTPUT MODE    STOP
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
     WINDOW   DIRECT    PDF
       │       │        │
       └───────┼────────┘
               ▼
        EXACT RECEIPT
               │
               ▼
          SMALL END FEED
               │
               ▼
          END PRINT JOB
               │
               ▼
              STOP
```

---

# 106. Absolute Printing Invariants

These rules must never be violated:

```text
SELECTED PAPER
=
ACTUAL RECEIPT WIDTH PROFILE
```

---

```text
58MM / 80MM
≠
FULL EDGE-TO-EDGE CONTENT WIDTH
```

Always reserve safe printable margins.

---

```text
PRINT
=
RECEIPT ONLY
```

Never the application UI.

---

```text
PRINT REQUEST
≠
PRINT IMMEDIATELY
```

Instead:

```text
Load
→ Render
→ Validate
→ Print
```

This prevents blank receipts.

---

```text
RECEIPT HEIGHT
=
CONTENT HEIGHT
+
SMALL END SPACE
```

Never A4 height.

---

```text
RECEIPT END
→
SMALL FEED
→
OPTIONAL CUT
→
END JOB
→
STOP PRINTER
```

No unnecessary paper after the receipt.

---

```text
PRINT FAILURE
≠
PAYMENT FAILURE
```

A successfully recorded payment remains recorded even when printing fails.

---

```text
REPRINT
=
PRINT EXISTING RECEIPT
```

Never:

```text
NEW PAYMENT
NEW RECEIPT NUMBER
NEW MEMBERSHIP EXTENSION
NEW FINANCE ENTRY
```

---

# 107. Final Requirement

The finished thermal printing experience should be this simple:

```text
Member pays fee
      ↓
Payment successful
      ↓
[ Print Receipt ]
      ↓
Application reads Settings
      ↓
Paper = 80mm
Output = Direct Printer
Printer = Configured Thermal Printer
      ↓
Receipt data loaded
      ↓
Receipt rendered
      ↓
Content validated
      ↓
Printer prints:

          SWAT FITNESS CENTER

            PAYMENT RECEIPT
--------------------------------

Receipt #: RCPT-000582
Date:      27/08/2026

Member:    Ali Khan
Member ID: MEM-00124

Plan:      Monthly Membership

Period:
27/08/2026 - 26/09/2026

Amount:    Rs. 2,000
Method:    Cash

--------------------------------

      Thank you for your payment!

      ↓
Small tear/cut feed
      ↓
Printer stops
```

The user should NOT need to:

```text
Resize the receipt
Change margins manually
Select A4
Fix scaling
Remove blank pages
Cut off empty paper
Re-enter payment data
```

Thermal receipt printing must be predictable, compact, reliable, and ready for daily gym use.
