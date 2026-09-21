import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View, type ViewStyle } from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { addressApi } from '../api/endpoints';
import type { AddressSuggestion } from '../api/types';
import { useShop } from '../shop/useShop';
import { theme } from '../theme';
import { Text } from './ui/text';
import { Input } from './ui/input';

interface AddressInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  country?: string;
  style?: ViewStyle;
  multiline?: boolean;
  editable?: boolean;
}

const MIN_QUERY_LENGTH = 3;

interface DropdownFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PORTAL_NAME = 'address-suggestions';

export function AddressInput({
  value,
  onChangeText,
  placeholder,
  country,
  style: styleProp,
  multiline,
  editable,
}: AddressInputProps) {
  const t = theme;
  const { shop } = useShop();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [frame, setFrame] = useState<DropdownFrame | null>(null);
  const requestSeq = useRef(0);
  const wrapperRef = useRef<View>(null);

  const effectiveCountry = shop?.countryCode ?? country;

  const measure = useCallback(() => {
    wrapperRef.current?.measureInWindow((x, y, w, h) => {
      setFrame({ x, y, width: w, height: h });
    });
  }, []);

  useEffect(() => {
    if (!focused) {
      setLoading(false);
      return;
    }

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await addressApi.autocomplete(query, effectiveCountry ?? undefined);
        if (seq !== requestSeq.current) return;
        setSuggestions(results);
        if (results.length > 0) {
          measure();
          setOpen(true);
        } else {
          setOpen(false);
        }
      } catch {
        if (seq !== requestSeq.current) return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [value, effectiveCountry, measure, focused]);

  const select = (suggestion: AddressSuggestion) => {
    onChangeText(suggestion.text);
    setOpen(false);
    setSuggestions([]);
  };

  const close = () => setOpen(false);

  const showDropdown = open && suggestions.length > 0 && frame !== null;

  const inputStyle = styleProp;

  return (
    <View ref={wrapperRef} style={{ position: 'relative' }}>
      <Input
        style={inputStyle}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        editable={editable}
        onFocus={() => {
          setFocused(true);
          if (suggestions.length > 0) measure();
          setOpen(suggestions.length > 0);
        }}
        onBlur={() => {
          setFocused(false);
          setTimeout(close, 150);
        }}
      />
      {loading && (
        <ActivityIndicator
          size="small"
          style={{ position: 'absolute', right: 12, top: 12 }}
          color={theme.primary}
        />
      )}

      {showDropdown && frame && (
        <Portal name={PORTAL_NAME}>
          <View
            style={{
              position: 'absolute',
              left: frame.x,
              top: frame.y + frame.height + 4,
              width: frame.width,
              zIndex: 1000,
              elevation: 1000,
            }}
          >
            <View
              style={{
                maxHeight: 224,
                overflow: 'hidden',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.card,
                ...Platform.select({
                  web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
                  default: {
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                  },
                }),
              }}
            >
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [
                    {
                      borderBottomWidth: 1,
                      borderBottomColor: t.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: pressed ? '#f1f5f9' : 'transparent',
                    },
                  ]}
                  onPress={() => select(s)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text }}>{s.text}</Text>
                  {s.description ? (
                    <Text style={{ fontSize: 12, color: t.textSecondary }}>{s.description}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </Portal>
      )}
    </View>
  );
}