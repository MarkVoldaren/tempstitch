import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BlanketPreviewScreen } from "@/screens/BlanketPreviewScreen";
import { BuildModeScreen } from "@/screens/BuildModeScreen";
import { ColorMappingScreen } from "@/screens/ColorMappingScreen";
import { ProjectSetupScreen } from "@/screens/ProjectSetupScreen";
import { ProjectSettingsScreen } from "@/screens/ProjectSettingsScreen";
import { ProjectsScreen } from "@/screens/ProjectsScreen";
import { useAppTheme } from "@/theme";
import { RootStackParamList } from "@/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { currentTheme: theme } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: "800",
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        component={ProjectsScreen}
        name="Projects"
        options={{ title: "Temperature Blankets" }}
      />
      <Stack.Screen
        component={ProjectSetupScreen}
        name="ProjectSetup"
        options={{ title: "Project Setup" }}
      />
      <Stack.Screen
        component={ColorMappingScreen}
        name="ColorMapping"
        options={{ title: "Color Mapping" }}
      />
      <Stack.Screen
        component={BlanketPreviewScreen}
        name="BlanketPreview"
        options={{ title: "Blanket Preview" }}
      />
      <Stack.Screen
        component={BuildModeScreen}
        name="BuildMode"
        options={{ title: "Build Mode" }}
      />
      <Stack.Screen
        component={ProjectSettingsScreen}
        name="ProjectSettings"
        options={{ title: "Project Settings" }}
      />
    </Stack.Navigator>
  );
}
