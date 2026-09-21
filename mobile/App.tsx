import { PortalHost } from '@rn-primitives/portal';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { CartProvider } from './src/cart/CartContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { MainTabsParamList, OrdersStackParamList, RootStackParamList } from './src/navigation';
import { theme } from './src/theme';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { OrderDetailScreen } from './src/screens/OrderDetailScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName): (props: { color: string; size: number }) => React.JSX.Element {
  return (props: { color: string; size: number }) => <Ionicons name={name} size={props.size} color={props.color} />;
}

function OrdersNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrdersList" component={OrdersScreen} />
      <OrdersStack.Screen name="Cart" component={CartScreen} />
      <OrdersStack.Screen name="Checkout" component={CheckoutScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  );
}

function MainTabs() {
  const t = theme;
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textSecondary,
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon('home-outline'), tabBarLabel: 'Home' }} />
      <Tabs.Screen name="Products" component={ProductsScreen} options={{ tabBarIcon: tabIcon('cube-outline'), tabBarLabel: 'Products' }} />
      <Tabs.Screen name="Orders" component={OrdersNavigator} options={{ tabBarIcon: tabIcon('receipt-outline'), tabBarLabel: 'My Orders' }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('person-circle-outline'), tabBarLabel: 'Profile' }} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { user, booting } = useAuth();
  const t = theme;

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <RootStack.Screen name="MainTabs" component={MainTabs} />
          ) : (
            <RootStack.Screen name="Login" component={LoginScreen} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <Root />
            <PortalHost />
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
