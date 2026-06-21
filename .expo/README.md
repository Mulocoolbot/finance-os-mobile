Finance OS Mobile - Phase 8K-5
Missing / Not-Found Guard Toasts

Base used:
- finance-os-mobile-main (1).zip
- This is the correct full base that already contains AppToast integration from Phase 8K-4.

Files changed:
- app/add-saving.tsx
- app/edit-account.tsx
- app/edit-budget.tsx
- app/trading-plan.tsx

What changed:
- Replaced lightweight "not found" guard Alert.alert calls with toast.showWarning.
- Saving goal not found -> Saving Not Found warning toast
- Account not found -> Account Not Found warning toast
- Budget not found -> Budget Not Found warning toast
- Trading plan not found -> Plan Not Found warning toast

What was intentionally not changed:
- Delete confirmation Alert dialogs
- Destructive warning Alert dialogs
- Delete result Alert dialogs
- Rollback/destructive flows
- Store/data logic
- Routes/navigation logic
- Imports that still need Alert for remaining confirm/delete dialogs

Apply instructions:
- Copy the files in this ZIP into the same paths in the project.
- Run: npx expo start --clear
- Test these flows:
  1. Edit missing saving goal guard
  2. Edit missing account guard
  3. Edit missing budget guard
  4. Delete missing trading plan guard

Status:
- Candidate checkpoint.
- Mark as safe/working only after Expo test passes.
