import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { AppButton, AppText, Card, NavigationHeader, Screen } from '@/components/ui';
import { useSubscription } from '@/features/subscriptions';
import {
  annualSavingsPercent,
  freeTrialLabel,
  subscriptionLegalLinks,
  subscriptionPackagesFromOffering,
} from '@/services/subscriptions';
import { createThemedStyles, useAppTheme } from '@/theme';

const BENEFITS = [
  'Unlimited CSV imports',
  'Advanced Home Screen widgets',
  'Advanced vocabulary analytics',
  'Cloud history and restore',
] as const;

type PlanPeriod = 'annual' | 'monthly';

export default function SubscriptionScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const {
    errorMessage,
    isConfigured,
    isLoading,
    isLoadingOffering,
    offering,
    operation,
    purchase,
    reloadOffering,
    restore,
    subscription,
    trialEligibility,
  } = useSubscription();
  const [selectedPeriod, setSelectedPeriod] = useState<PlanPeriod>('annual');
  const packages = useMemo(() => subscriptionPackagesFromOffering(offering), [offering]);
  const savings = annualSavingsPercent(packages.annual, packages.monthly);
  const activePeriod: PlanPeriod = packages[selectedPeriod]
    ? selectedPeriod
    : packages.annual
      ? 'annual'
      : 'monthly';
  const selectedPackage = packages[activePeriod];
  const selectedEligibility = selectedPackage
    ? trialEligibility[selectedPackage.product.identifier]
    : undefined;
  const trialLabel = selectedPackage
    ? freeTrialLabel(selectedPackage, nativePlatform())
    : null;
  const offersTrial = selectedEligibility === 'eligible' && trialLabel !== null;
  const legalLinks = subscriptionLegalLinks();

  async function handlePurchase() {
    if (!selectedPackage) return;

    try {
      const result = await purchase(selectedPackage);
      if (result === 'purchased') {
        Alert.alert('Premium is active', 'Your WordEcho Premium benefits are ready.');
      }
    } catch {
      Alert.alert('Purchase not completed', 'Please check your connection and try again.');
    }
  }

  async function handleRestore() {
    try {
      const restored = await restore();
      Alert.alert(
        restored ? 'Purchases restored' : 'No active purchase found',
        restored
          ? 'WordEcho Premium is active on this device.'
          : 'We could not find an active WordEcho Premium purchase for this store account.',
      );
    } catch {
      Alert.alert('Restore failed', 'Purchases could not be restored. Please try again.');
    }
  }

  async function openUrl(url: string, failureTitle: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(failureTitle, 'The page could not be opened. Please try again.');
    }
  }

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <NavigationHeader onBack={() => router.back()} title="WordEcho Premium" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons color={theme.colors.brand.primary} name="workspace-premium" size={32} />
          </View>
          <AppText style={styles.centerText} variant="title">
            Grow your vocabulary without limits
          </AppText>
          <AppText style={styles.centerText} tone="secondary">
            Keep the core vault free. Upgrade when you want more ways to import, review, and
            understand your words.
          </AppText>
        </View>

        <Card style={styles.benefitsCard}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={styles.checkIcon}>
                <MaterialIcons color={theme.colors.semantic.success.foreground} name="check" size={18} />
              </View>
              <AppText style={styles.flex}>{benefit}</AppText>
            </View>
          ))}
        </Card>

        {subscription.isPremium ? (
          <Card style={styles.activeCard}>
            <View style={styles.activeHeading}>
              <View style={styles.activeIcon}>
                <MaterialIcons color={theme.colors.semantic.success.foreground} name="check" size={22} />
              </View>
              <View style={styles.flex}>
                <AppText variant="subtitle">
                  {subscription.isTrial ? 'Your free trial is active' : 'Premium is active'}
                </AppText>
                <AppText tone="secondary" variant="caption">
                  {subscriptionSummary(subscription.expirationDate, subscription.willRenew)}
                </AppText>
              </View>
            </View>
            {subscription.managementUrl ? (
              <AppButton
                label="Manage subscription"
                onPress={() =>
                  void openUrl(subscription.managementUrl!, 'Unable to manage subscription')
                }
                variant="secondary"
              />
            ) : null}
          </Card>
        ) : (
          <View style={styles.purchaseSection}>
            {!isConfigured ? (
              <Card style={styles.noticeCard}>
                <AppText variant="label">Premium is not configured in this build</AppText>
                <AppText tone="secondary" variant="caption">
                  Add the platform RevenueCat public SDK key and rebuild the development app.
                </AppText>
              </Card>
            ) : isLoading || isLoadingOffering ? (
              <View accessibilityLabel="Loading Premium plans" style={styles.loadingPlans}>
                <ActivityIndicator color={theme.colors.brand.primary} />
                <AppText tone="secondary">Loading local store prices…</AppText>
              </View>
            ) : packages.annual || packages.monthly ? (
              <View style={styles.planList}>
                {packages.annual ? (
                  <PlanCard
                    item={packages.annual}
                    label="Annual"
                    onPress={() => setSelectedPeriod('annual')}
                    savings={savings}
                    selected={activePeriod === 'annual'}
                  />
                ) : null}
                {packages.monthly ? (
                  <PlanCard
                    item={packages.monthly}
                    label="Monthly"
                    onPress={() => setSelectedPeriod('monthly')}
                    selected={activePeriod === 'monthly'}
                  />
                ) : null}
              </View>
            ) : (
              <Card style={styles.noticeCard}>
                <AppText variant="label">Premium plans are unavailable</AppText>
                <AppText tone="secondary" variant="caption">
                  Confirm that the monthly and annual products are attached to the current
                  RevenueCat offering.
                </AppText>
                <AppButton
                  label="Try again"
                  onPress={() => void reloadOffering()}
                  variant="secondary"
                />
              </Card>
            )}

            {errorMessage ? (
              <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
                {errorMessage}
              </AppText>
            ) : null}

            {selectedPackage ? (
              <View style={styles.checkout}>
                <AppButton
                  label={offersTrial ? `Start ${trialLabel} free trial` : 'Continue with Premium'}
                  loading={operation === 'purchase'}
                  onPress={() => void handlePurchase()}
                />
                <AppText style={styles.renewalText} tone="secondary" variant="caption">
                  {offersTrial ? `${trialLabel} free, then ` : ''}
                  {selectedPackage.product.priceString} per {activePeriod === 'annual' ? 'year' : 'month'}.
                  {' Auto-renews unless cancelled.'}
                </AppText>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.footerActions}>
          <AppButton
            disabled={!isConfigured}
            label="Restore purchases"
            loading={operation === 'restore'}
            onPress={() => void handleRestore()}
            variant="ghost"
          />
          <View style={styles.legalRow}>
            {legalLinks.termsUrl ? (
              <Pressable onPress={() => void openUrl(legalLinks.termsUrl!, 'Unable to open terms')}>
                <AppText style={styles.linkText} variant="caption">Terms of Use</AppText>
              </Pressable>
            ) : null}
            {legalLinks.privacyUrl ? (
              <Pressable onPress={() => void openUrl(legalLinks.privacyUrl!, 'Unable to open privacy policy')}>
                <AppText style={styles.linkText} variant="caption">Privacy Policy</AppText>
              </Pressable>
            ) : null}
          </View>
          {!legalLinks.termsUrl || !legalLinks.privacyUrl ? (
            <AppText style={styles.legalNotice} tone="tertiary" variant="caption">
              Terms and privacy links must be configured before release.
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  item,
  label,
  onPress,
  savings,
  selected,
}: {
  item: PurchasesPackage;
  label: string;
  onPress: () => void;
  savings?: number | null;
  selected: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.flex}>
        <View style={styles.planTitleRow}>
          <AppText variant="label">{label}</AppText>
          {savings ? (
            <View style={styles.savingsBadge}>
              <AppText style={styles.savingsText} variant="caption">Save {savings}%</AppText>
            </View>
          ) : null}
        </View>
        {label === 'Annual' && item.product.pricePerMonthString ? (
          <AppText tone="secondary" variant="caption">
            {item.product.pricePerMonthString} per month
          </AppText>
        ) : null}
      </View>
      <View style={styles.priceCopy}>
        <AppText variant="label">{item.product.priceString}</AppText>
        <AppText tone="tertiary" variant="caption">/{label === 'Annual' ? 'year' : 'month'}</AppText>
      </View>
      <MaterialIcons
        color={selected ? theme.colors.brand.primary : theme.colors.content.tertiary}
        name="chevron-right"
        size={18}
      />
    </Pressable>
  );
}

function nativePlatform(): 'android' | 'ios' | 'other' {
  return Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : 'other';
}

function subscriptionSummary(expirationDate: string | null, willRenew: boolean): string {
  if (!expirationDate) return 'Your Premium benefits are available.';

  const formattedDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(expirationDate),
  );
  return willRenew ? `Renews on ${formattedDate}.` : `Available until ${formattedDate}.`;
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: '100%',
  },
  hero: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  centerText: { textAlign: 'center' },
  benefitsCard: { gap: theme.spacing.md },
  benefitRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  checkIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.semantic.success.background,
    borderRadius: theme.radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  flex: { flex: 1 },
  activeCard: { gap: theme.spacing.lg },
  activeHeading: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  activeIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.semantic.success.background,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  purchaseSection: { gap: theme.spacing.md },
  noticeCard: { gap: theme.spacing.md },
  loadingPlans: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  planList: { gap: theme.spacing.sm },
  planCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 82,
    padding: theme.spacing.md,
  },
  planCardSelected: { borderColor: theme.colors.brand.primary, borderWidth: 2 },
  pressed: { opacity: 0.82 },
  radio: {
    alignItems: 'center',
    borderColor: theme.colors.border.strong,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioSelected: { borderColor: theme.colors.brand.primary },
  radioDot: {
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.pill,
    height: 10,
    width: 10,
  },
  planTitleRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.xs },
  savingsBadge: {
    backgroundColor: theme.colors.semantic.success.background,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  savingsText: { color: theme.colors.semantic.success.foreground },
  priceCopy: { alignItems: 'flex-end' },
  checkout: { gap: theme.spacing.sm },
  renewalText: { textAlign: 'center' },
  errorText: { color: theme.colors.semantic.error.foreground },
  footerActions: { alignItems: 'center', gap: theme.spacing.xs },
  legalRow: { flexDirection: 'row', gap: theme.spacing.lg },
  linkText: { color: theme.colors.brand.primary, textDecorationLine: 'underline' },
  legalNotice: { textAlign: 'center' },
}));
