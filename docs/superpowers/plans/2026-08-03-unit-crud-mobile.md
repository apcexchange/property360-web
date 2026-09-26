# Unit Add/Edit/Delete Mobile UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a landlord add a new unit, edit a unit's number/bed-bath/size/rent/fees, and delete a vacant unit, from the mobile app's `PropertyDetailsScreen`.

**Architecture:** `PropertyDetailsScreen.tsx` already calls `api.delete`/`api.put` directly inline (see its existing `handleDelete` and `handleSaveValue`), it does **not** use the `useProperty`/`useAddUnit` React Query hooks at all, despite those existing elsewhere in the codebase. This plan follows the screen's own established local convention (inline `api` calls + `queryClient.invalidateQueries` + `Alert.alert`/local modal state), rather than introducing the unused hook layer, since "follow established patterns in the file you're editing" wins over spec-level assumptions made before this file was read in full.

**Tech Stack:** React Native (Expo 54), React Query (`@tanstack/react-query`, used here only for the existing `useQuery` property fetch + manual `invalidateQueries`), `axios` (via the shared `api` instance).

**Repo:** `property360-mobile.git`. Currently checked out on `feat/wallet-ui`, which is clean (no uncommitted changes) and only 3 commits behind `origin/main`, with zero drift from `main` in the target file. Lower risk than the other two repos, but still build this on its own branch.

**Spec:** `docs/superpowers/specs/2026-08-03-unit-add-edit-delete-design.md`

---

## Before you start

- **Work in an isolated worktree off `origin/main`**, per the `superpowers:using-git-worktrees` skill, new branch e.g. `feat/unit-crud-mobile`. The current `feat/wallet-ui` checkout is clean, but stay consistent with the pattern used for the other two repos in this feature.
- **Depends on the backend plan** (`docs/superpowers/plans/2026-08-03-unit-crud-backend.md`) being merged/deployed, since this calls `PUT`/`DELETE /properties/:id/units/:unitId`.
- **No test runner exists in this repo.** Verification is `tsc --noEmit` plus running the app on an iOS/Android simulator and clicking through the flow.
- **Ships to real users only on the next store release** (no OTA, per this repo's release pipeline in `mobile/RELEASE.md`). Building and merging this now doesn't make it live for landlords until that release goes through TestFlight/Play review.
- **Known limitation, out of scope:** the backend `Unit` model has no `rentPeriod` field (silently dropped even where sent today). The new form in this plan does not include a rent-period selector, only fields that actually persist.

---

### Task 1: Add unit form state and save/delete handlers

**Files:**
- Modify: `src/screens/property/PropertyDetailsScreen.tsx`

- [ ] **Step 1: Import `PropertyUnit`**

Find:

```tsx
import { Property } from '../../types/property';
```

Replace with:

```tsx
import { Property, PropertyUnit } from '../../types/property';
```

- [ ] **Step 2: Add state**

Find:

```tsx
  const [showValueModal, setShowValueModal] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [savingValue, setSavingValue] = useState(false);
```

Replace with:

```tsx
  const [showValueModal, setShowValueModal] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [savingValue, setSavingValue] = useState(false);
  const [unitModal, setUnitModal] = useState<
    { mode: 'add' } | { mode: 'edit'; unit: PropertyUnit } | null
  >(null);
  const [unitForm, setUnitForm] = useState({
    unitNumber: '',
    bedrooms: '1',
    bathrooms: '1',
    size: '',
    rentAmount: '',
    securityDeposit: '',
    cautionFee: '',
    agentFee: '',
    agreementFee: '',
    legalFee: '',
    serviceCharge: '',
    otherFee: '',
    otherFeeDescription: '',
  });
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitFormError, setUnitFormError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the open/save/delete handlers**

Find the existing `handleSaveValue` function:

```tsx
  const handleSaveValue = async () => {
    const numeric = Number(valueInput.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numeric) || numeric < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingValue(true);
    try {
      await api.put(`/properties/${propertyId}`, { currentValue: numeric });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'balance-sheet'] });
      toast.success('Property value updated');
      setShowValueModal(false);
    } catch (error) {
      toast.error('Failed to update value');
    } finally {
      setSavingValue(false);
    }
  };
```

Immediately after it, insert:

```tsx

  const openAddUnit = () => {
    const nextNumber = `Flat ${(property?.units?.length || 0) + 1}`;
    setUnitForm({
      unitNumber: nextNumber,
      bedrooms: '1',
      bathrooms: '1',
      size: '',
      rentAmount: '',
      securityDeposit: '',
      cautionFee: '',
      agentFee: '',
      agreementFee: '',
      legalFee: '',
      serviceCharge: '',
      otherFee: '',
      otherFeeDescription: '',
    });
    setUnitFormError(null);
    setUnitModal({ mode: 'add' });
  };

  const openEditUnit = (unit: PropertyUnit) => {
    setUnitForm({
      unitNumber: unit.unitNumber,
      bedrooms: String(unit.bedrooms),
      bathrooms: String(unit.bathrooms),
      size: unit.size ? String(unit.size) : '',
      rentAmount: unit.rentAmount ? String(unit.rentAmount) : '',
      securityDeposit: unit.defaultFees?.securityDeposit ? String(unit.defaultFees.securityDeposit) : '',
      cautionFee: unit.defaultFees?.cautionFee ? String(unit.defaultFees.cautionFee) : '',
      agentFee: unit.defaultFees?.agentFee ? String(unit.defaultFees.agentFee) : '',
      agreementFee: unit.defaultFees?.agreementFee ? String(unit.defaultFees.agreementFee) : '',
      legalFee: unit.defaultFees?.legalFee ? String(unit.defaultFees.legalFee) : '',
      serviceCharge: unit.defaultFees?.serviceCharge ? String(unit.defaultFees.serviceCharge) : '',
      otherFee: unit.defaultFees?.otherFee ? String(unit.defaultFees.otherFee) : '',
      otherFeeDescription: unit.defaultFees?.otherFeeDescription ?? '',
    });
    setUnitFormError(null);
    setUnitModal({ mode: 'edit', unit });
  };

  const handleSaveUnit = async () => {
    const unitNumber = unitForm.unitNumber.trim();
    const rentAmount = Number(unitForm.rentAmount);
    if (!unitNumber) {
      setUnitFormError('Unit number is required');
      return;
    }
    if (!rentAmount || rentAmount <= 0) {
      setUnitFormError('Rent amount must be greater than 0');
      return;
    }
    const payload = {
      unitNumber,
      bedrooms: Number(unitForm.bedrooms) || 0,
      bathrooms: Number(unitForm.bathrooms) || 0,
      size: unitForm.size ? Number(unitForm.size) : undefined,
      rentAmount,
      defaultFees: {
        securityDeposit: unitForm.securityDeposit ? Number(unitForm.securityDeposit) : undefined,
        cautionFee: unitForm.cautionFee ? Number(unitForm.cautionFee) : undefined,
        agentFee: unitForm.agentFee ? Number(unitForm.agentFee) : undefined,
        agreementFee: unitForm.agreementFee ? Number(unitForm.agreementFee) : undefined,
        legalFee: unitForm.legalFee ? Number(unitForm.legalFee) : undefined,
        serviceCharge: unitForm.serviceCharge ? Number(unitForm.serviceCharge) : undefined,
        otherFee: unitForm.otherFee ? Number(unitForm.otherFee) : undefined,
        otherFeeDescription: unitForm.otherFee ? (unitForm.otherFeeDescription || undefined) : undefined,
      },
    };
    setSavingUnit(true);
    setUnitFormError(null);
    try {
      if (unitModal?.mode === 'edit') {
        const unitId = unitModal.unit._id || unitModal.unit.id;
        await api.put(`/properties/${propertyId}/units/${unitId}`, payload);
        toast.success('Unit updated');
      } else {
        await api.post(`/properties/${propertyId}/units`, payload);
        toast.success('Unit added');
      }
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      setUnitModal(null);
    } catch (error: any) {
      setUnitFormError(error?.response?.data?.message || 'Could not save this unit.');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = (unit: PropertyUnit) => {
    if (unit.isOccupied) return;
    Alert.alert(
      'Delete Unit',
      `Delete ${unit.unitNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const unitId = unit._id || unit.id;
              await api.delete(`/properties/${propertyId}/units/${unitId}`);
              queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
              toast.success('Unit deleted');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.response?.data?.message || 'Failed to delete unit. Please try again.'
              );
            }
          },
        },
      ]
    );
  };
```

- [ ] **Step 4: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass). `property` is used before its `useQuery` declaration further down the file in `openAddUnit`, that's fine, it's referenced inside a closure that only runs on button press, by which time the component has rendered and `property` is in scope (same pattern the file already uses for `handleEdit`/`handleDelete` referencing `property` above their own declarations).

- [ ] **Step 5: Commit**

```bash
git add src/screens/property/PropertyDetailsScreen.tsx
git commit -m "feat(properties): add unit add/edit/delete handlers"
```

---

### Task 2: Add the "Add unit" button and per-unit edit/delete icons

**Files:**
- Modify: `src/screens/property/PropertyDetailsScreen.tsx`

- [ ] **Step 1: Add the "Add unit" link to the Units section header**

Find:

```tsx
          {/* Units Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Units</Text>
              {property.units && property.units.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllUnits(!showAllUnits)}>
                  <Text style={styles.seeAllText}>{showAllUnits ? 'Show Less' : 'See All'}</Text>
                </TouchableOpacity>
              )}
            </View>
```

Replace with:

```tsx
          {/* Units Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Units</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <TouchableOpacity onPress={openAddUnit}>
                  <Text style={styles.seeAllText}>+ Add unit</Text>
                </TouchableOpacity>
                {property.units && property.units.length > 3 && (
                  <TouchableOpacity onPress={() => setShowAllUnits(!showAllUnits)}>
                    <Text style={styles.seeAllText}>{showAllUnits ? 'Show Less' : 'See All'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
```

- [ ] **Step 2: Add edit/delete icons to each unit card**

Find:

```tsx
                    {!unit.isOccupied && (
                      <TouchableOpacity
                        onPress={() => {
                          if (unit.isListed) {
                            unlistUnit((unit._id || unit.id)!, {
                              onSuccess: () => {
                                toast.success('Unit removed from marketplace');
                                queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                              },
                              onError: () => toast.error('Failed to unlist unit'),
                            });
                          } else {
                            listUnit({ unitId: (unit._id || unit.id)! }, {
                              onSuccess: () => {
                                toast.success('Unit listed on marketplace');
                                queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                              },
                              onError: () => toast.error('Failed to list unit'),
                            });
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: unit.isListed ? colors.error + '15' : colors.accent + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 4,
                          borderRadius: borderRadius.md,
                          marginTop: spacing.xs,
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name={unit.isListed ? 'close-circle-outline' : 'storefront-outline'}
                          size={14}
                          color={unit.isListed ? colors.error : colors.accent}
                        />
                        <Text style={{
                          fontSize: fontSize.xs,
                          fontFamily: fontFamily.medium,
                          color: unit.isListed ? colors.error : colors.accent,
                        }}>
                          {unit.isListed ? 'Unlist' : 'List'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
```

Replace with:

```tsx
                    {!unit.isOccupied && (
                      <TouchableOpacity
                        onPress={() => {
                          if (unit.isListed) {
                            unlistUnit((unit._id || unit.id)!, {
                              onSuccess: () => {
                                toast.success('Unit removed from marketplace');
                                queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                              },
                              onError: () => toast.error('Failed to unlist unit'),
                            });
                          } else {
                            listUnit({ unitId: (unit._id || unit.id)! }, {
                              onSuccess: () => {
                                toast.success('Unit listed on marketplace');
                                queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                              },
                              onError: () => toast.error('Failed to list unit'),
                            });
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: unit.isListed ? colors.error + '15' : colors.accent + '15',
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 4,
                          borderRadius: borderRadius.md,
                          marginTop: spacing.xs,
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name={unit.isListed ? 'close-circle-outline' : 'storefront-outline'}
                          size={14}
                          color={unit.isListed ? colors.error : colors.accent}
                        />
                        <Text style={{
                          fontSize: fontSize.xs,
                          fontFamily: fontFamily.medium,
                          color: unit.isListed ? colors.error : colors.accent,
                        }}>
                          {unit.isListed ? 'Unlist' : 'List'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                      <TouchableOpacity onPress={() => openEditUnit(unit)} style={styles.unitIconBtn}>
                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteUnit(unit)}
                        disabled={unit.isOccupied}
                        style={[styles.unitIconBtn, unit.isOccupied && styles.unitIconBtnDisabled]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={unit.isOccupied ? colors.textSecondary : colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
```

- [ ] **Step 3: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```bash
git add src/screens/property/PropertyDetailsScreen.tsx
git commit -m "feat(properties): add per-unit edit/delete icons and Add unit link"
```

---

### Task 3: Add the unit form modal and its styles

**Files:**
- Modify: `src/screens/property/PropertyDetailsScreen.tsx`

- [ ] **Step 1: Render the modal**

Find the closing of the existing property valuation modal:

```tsx
            <TouchableOpacity
                onPress={handleSaveValue}
                style={[styles.valueModalBtn, styles.valueModalBtnPrimary]}
                disabled={savingValue}
              >
                <Text style={styles.valueModalBtnPrimaryText}>
                  {savingValue ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
```

Replace with:

```tsx
            <TouchableOpacity
                onPress={handleSaveValue}
                style={[styles.valueModalBtn, styles.valueModalBtnPrimary]}
                disabled={savingValue}
              >
                <Text style={styles.valueModalBtnPrimaryText}>
                  {savingValue ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/edit unit modal */}
      <Modal
        visible={!!unitModal}
        transparent
        animationType="fade"
        onRequestClose={() => !savingUnit && setUnitModal(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.unitFormCard}>
            <Text style={styles.valueModalTitle}>
              {unitModal?.mode === 'edit' ? `Edit ${unitModal.unit.unitNumber}` : 'Add unit'}
            </Text>
            <ScrollView style={styles.unitFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.unitFormLabel}>Unit number</Text>
              <TextInput
                value={unitForm.unitNumber}
                onChangeText={(t) => setUnitForm((p) => ({ ...p, unitNumber: t }))}
                placeholder="Flat 12"
                placeholderTextColor={colors.textSecondary}
                style={styles.unitFormInput}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitFormLabel}>Bedrooms</Text>
                  <TextInput
                    value={unitForm.bedrooms}
                    onChangeText={(t) => setUnitForm((p) => ({ ...p, bedrooms: t.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    style={styles.unitFormInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitFormLabel}>Bathrooms</Text>
                  <TextInput
                    value={unitForm.bathrooms}
                    onChangeText={(t) => setUnitForm((p) => ({ ...p, bathrooms: t.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    style={styles.unitFormInput}
                  />
                </View>
              </View>
              <Text style={styles.unitFormLabel}>Size (m², optional)</Text>
              <TextInput
                value={unitForm.size}
                onChangeText={(t) => setUnitForm((p) => ({ ...p, size: t.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
                style={styles.unitFormInput}
              />
              <Text style={styles.unitFormLabel}>Rent (NGN)</Text>
              <TextInput
                value={unitForm.rentAmount}
                onChangeText={(t) => setUnitForm((p) => ({ ...p, rentAmount: t.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
                placeholder="500000"
                placeholderTextColor={colors.textSecondary}
                style={styles.unitFormInput}
              />
              <Text style={[styles.unitFormLabel, { marginTop: spacing.md }]}>
                Default fees (optional)
              </Text>
              {(
                [
                  ['securityDeposit', 'Security deposit'],
                  ['cautionFee', 'Caution fee'],
                  ['agentFee', 'Agent fee'],
                  ['agreementFee', 'Agreement fee'],
                  ['legalFee', 'Legal fee'],
                  ['serviceCharge', 'Service charge'],
                  ['otherFee', 'Other fee'],
                ] as const
              ).map(([key, label]) => (
                <View key={key}>
                  <Text style={styles.unitFormLabel}>{label}</Text>
                  <TextInput
                    value={unitForm[key]}
                    onChangeText={(t) => setUnitForm((p) => ({ ...p, [key]: t.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.unitFormInput}
                  />
                </View>
              ))}
              {!!unitForm.otherFee && (
                <View>
                  <Text style={styles.unitFormLabel}>Other fee description</Text>
                  <TextInput
                    value={unitForm.otherFeeDescription}
                    onChangeText={(t) => setUnitForm((p) => ({ ...p, otherFeeDescription: t }))}
                    placeholder="What's this fee for?"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.unitFormInput}
                  />
                </View>
              )}
              {unitFormError && <Text style={styles.unitFormError}>{unitFormError}</Text>}
            </ScrollView>
            <View style={styles.valueModalButtons}>
              <TouchableOpacity
                onPress={() => setUnitModal(null)}
                style={[styles.valueModalBtn, styles.valueModalBtnSecondary]}
                disabled={savingUnit}
              >
                <Text style={styles.valueModalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveUnit}
                style={[styles.valueModalBtn, styles.valueModalBtnPrimary]}
                disabled={savingUnit}
              >
                <Text style={styles.valueModalBtnPrimaryText}>
                  {savingUnit ? 'Saving…' : unitModal?.mode === 'edit' ? 'Save changes' : 'Add unit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: Add the new styles**

Find:

```tsx
  valueModalBtnPrimaryText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.buttonPrimaryText,
  },
} as const);
```

Replace with:

```tsx
  valueModalBtnPrimaryText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.buttonPrimaryText,
  },
  unitIconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
  },
  unitIconBtnDisabled: {
    opacity: 0.4,
  },
  unitFormCard: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignSelf: 'center',
  },
  unitFormScroll: {
    maxHeight: 420,
  },
  unitFormLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  unitFormInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.heading,
  },
  unitFormError: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },
} as const);
```

- [ ] **Step 3: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 4: Manual verification on a simulator**

Run: `cd mobile && npm start`, then open on an iOS or Android simulator, navigate to a property you own:
1. Tap "+ Add unit", fill the form, save, confirm the new unit appears.
2. Tap the pencil icon on a unit, change its rent, save, confirm the card updates.
3. Confirm the trash icon is dimmed/disabled on an occupied unit.
4. Tap the trash icon on a vacant unit, confirm the delete alert, confirm it disappears from the list after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/screens/property/PropertyDetailsScreen.tsx
git commit -m "feat(properties): add unit form modal and styles"
```

---

### Task 4: Push and open a PR to `main`

**Files:** none (git operations only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/unit-crud-mobile
```

- [ ] **Step 2: Open a PR**

```bash
gh pr create --repo apcexchange/property360-mobile --base main --head feat/unit-crud-mobile \
  --title "feat(properties): add/edit/delete unit on PropertyDetailsScreen" \
  --body "Adds an Add unit action, per-unit edit/delete icons, and a shared form modal to the mobile property details screen. Requires the backend PUT/DELETE /:id/units/:unitId endpoints. Ships to users on the next store release only (no OTA). See docs/superpowers/specs/2026-08-03-unit-add-edit-delete-design.md."
```

If `gh` isn't authenticated, push prints a compare URL like `https://github.com/apcexchange/property360-mobile/pull/new/feat/unit-crud-mobile`, open that manually. Remember: merging this doesn't ship it to users, it still needs a tagged release (`mobile-v*`) through the existing fastlane pipeline.
