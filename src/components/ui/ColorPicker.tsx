import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { PanResponder, View } from 'react-native';

// ── HSV ↔ HEX helpers ────────────────────────────────────────────────────────

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const val = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(val * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, v];
}

function clamp(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

const SB_SIZE = 220;
const HUE_HEIGHT = 20;
const THUMB_SIZE = 18;

export function ColorPicker({ value, onChange }: Props) {
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);
  const [h, s, bv] = isValidHex ? hexToHsv(value) : [0, 1, 1];

  const hueColor = hsvToHex(h, 1, 1);

  // ── SB (saturation / brightness) panel ──────────────────────────────────────
  const sbRef = useRef<View>(null);

  const sbPan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      sbRef.current?.measure((_fx, _fy, width, height, px, py) => {
        const newS = clamp((e.nativeEvent.pageX - px) / width);
        const newV = clamp(1 - (e.nativeEvent.pageY - py) / height);
        onChange(hsvToHex(h, newS, newV));
      });
    },
    onPanResponderMove: (e) => {
      sbRef.current?.measure((_fx, _fy, width, height, px, py) => {
        const newS = clamp((e.nativeEvent.pageX - px) / width);
        const newV = clamp(1 - (e.nativeEvent.pageY - py) / height);
        onChange(hsvToHex(h, newS, newV));
      });
    },
  });

  // ── Hue strip ───────────────────────────────────────────────────────────────
  const hueRef = useRef<View>(null);

  const huePan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      hueRef.current?.measure((_fx, _fy, width, _height, px) => {
        const newH = clamp((e.nativeEvent.pageX - px) / width) * 360;
        onChange(hsvToHex(newH, s, bv));
      });
    },
    onPanResponderMove: (e) => {
      hueRef.current?.measure((_fx, _fy, width, _height, px) => {
        const newH = clamp((e.nativeEvent.pageX - px) / width) * 360;
        onChange(hsvToHex(newH, s, bv));
      });
    },
  });

  return (
    <View style={{ gap: 10, marginBottom: 8 }}>
      {/* Saturation / Brightness square */}
      <View
        ref={sbRef}
        {...sbPan.panHandlers}
        style={{ width: SB_SIZE, height: SB_SIZE, borderRadius: 8, overflow: 'hidden' }}>
        {/* White → hue */}
        <LinearGradient
          colors={['#ffffff', hueColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        {/* Transparent → black (top to bottom) */}
        <LinearGradient
          colors={['transparent', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        {/* Thumb */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: s * SB_SIZE - THUMB_SIZE / 2,
            top: (1 - bv) * SB_SIZE - THUMB_SIZE / 2,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: value,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 3,
            elevation: 4,
          }}
        />
      </View>

      {/* Hue strip */}
      <View
        ref={hueRef}
        {...huePan.panHandlers}
        style={{ height: HUE_HEIGHT, borderRadius: HUE_HEIGHT / 2, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
        {/* Thumb */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: HUE_HEIGHT / 2 - THUMB_SIZE / 2,
            left: (h / 360) * SB_SIZE - THUMB_SIZE / 2,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: hueColor,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 3,
            elevation: 4,
          }}
        />
      </View>
    </View>
  );
}
