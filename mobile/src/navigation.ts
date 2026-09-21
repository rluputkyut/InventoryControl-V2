import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Products: undefined;
  Profile: undefined;
  Orders: NavigatorScreenParams<OrdersStackParamList> | undefined;
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderDetail: { id: number };
};

export type RootTabParamList = MainTabsParamList;