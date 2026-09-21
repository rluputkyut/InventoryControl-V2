import { Platform } from 'react-native';

const defaultHost = Platform.select({ android: 'http://10.0.2.2:5023', default: 'http://localhost:5023' })!;

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? defaultHost;