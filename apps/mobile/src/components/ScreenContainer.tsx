import { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTheme, useThemedStyles } from "@/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
}>;

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const content = (
    <View style={[styles.inner, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    inner: {
      flex: 1,
    },
    padded: {
      paddingHorizontal: theme.spacing.md,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
  });
