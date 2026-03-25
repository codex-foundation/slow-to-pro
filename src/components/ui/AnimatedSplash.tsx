import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polyline, Rect } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

// 2 * π * 32 (radius of the clock ring)
const CIRCUMFERENCE = 201.06;

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const hasFinished = useRef(false);

  // Start visible — native splash already shows the icon, no flicker on handoff
  const iconOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const dashOffset = useSharedValue(CIRCUMFERENCE);
  const handRotation = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordScaleX = useSharedValue(0.97);
  const tagOpacity = useSharedValue(0);
  const tagTranslateY = useSharedValue(6);
  const overlayOpacity = useSharedValue(1);

  const handleFinish = useCallback(() => {
    if (!hasFinished.current) {
      hasFinished.current = true;
      onFinish();
    }
  }, [onFinish]);

  const startAnimation = useCallback(() => {
    // Reset all values
    iconOpacity.value = 1;
    iconScale.value = 1;
    dashOffset.value = CIRCUMFERENCE;
    handRotation.value = 0;
    wordOpacity.value = 0;
    wordScaleX.value = 0.97;
    tagOpacity.value = 0;
    tagTranslateY.value = 6;
    overlayOpacity.value = 1;

    // 2. Ring draw (0.65s, delay 0.35s)
    dashOffset.value = withDelay(350, withTiming(0, { duration: 650, easing: Easing.ease }));

    // 3. Hand spin 0→765° (2.1s, delay 0.75s)
    handRotation.value = withDelay(
      750,
      withTiming(765, { duration: 2100, easing: Easing.bezier(0.22, 0.1, 0.04, 1) })
    );

    // 4. Word reveal (1s, delay 2.6s)
    wordOpacity.value = withDelay(
      2600,
      withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 0, 0, 1) })
    );
    wordScaleX.value = withDelay(
      2600,
      withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 0, 0, 1) })
    );

    // 5. Tag reveal (0.7s, delay 3.2s)
    tagOpacity.value = withDelay(
      3200,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) })
    );
    tagTranslateY.value = withDelay(
      3200,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.ease) })
    );

    // 6. Fade out overlay (0.5s, delay 4.3s), then call onFinish
    overlayOpacity.value = withDelay(
      4300,
      withTiming(0, { duration: 500 }, () => {
        runOnJS(handleFinish)();
      })
    );
  }, [
    handleFinish,
    iconOpacity,
    iconScale,
    dashOffset,
    handRotation,
    wordOpacity,
    wordScaleX,
    tagOpacity,
    tagTranslateY,
    overlayOpacity,
  ]);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  // Rotation matrix around the clock centre (60, 62):
  //   a = cos θ,  b = sin θ,  c = -sin θ,  d = cos θ
  //   e = cx(1-cos θ) + cy·sin θ,  f = cy(1-cos θ) - cx·sin θ
  const handProps = useAnimatedProps(() => {
    'worklet';
    const theta = (handRotation.value * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const cx = 60;
    const cy = 62;
    return {
      matrix: [cos, sin, -sin, cos, cx * (1 - cos) + cy * sin, cy * (1 - cos) - cx * sin],
    };
  });

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scaleX: wordScaleX.value }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagTranslateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  // Icon is 128×128; centre it at exactly half the screen height
  const iconTop = screenHeight / 2 - 64;
  const textTop = screenHeight / 2 + 64 + 40; // below icon + gap

  return (
    <Animated.View style={[styles.container, overlayStyle]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={startAnimation}>
        {/* Icon pinned to screen vertical centre */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: iconTop,
              left: 0,
              width: screenWidth,
              alignItems: 'center',
            },
            iconStyle,
          ]}>
          <Svg width={128} height={128} viewBox="0 0 120 120">
            <Rect width={120} height={120} rx={28} fill="#2563EB" />
            {/* Stopwatch crown */}
            <Line
              x1={48}
              y1={24}
              x2={72}
              y2={24}
              stroke="white"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
            <Line
              x1={60}
              y1={17}
              x2={60}
              y2={26}
              stroke="white"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
            {/* Hour markers (3, 9, 12) */}
            <Line
              x1={92}
              y1={62}
              x2={86}
              y2={62}
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.35}
            />
            <Line
              x1={28}
              y1={62}
              x2={34}
              y2={62}
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.35}
            />
            <Line
              x1={60}
              y1={30}
              x2={60}
              y2={30}
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.35}
            />
            {/* Animated ring */}
            <AnimatedCircle
              cx={60}
              cy={62}
              r={32}
              fill="none"
              stroke="white"
              strokeWidth={4}
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={ringProps}
            />
            {/* Animated hand group — rotates around clock center (60, 62) */}
            <AnimatedG animatedProps={handProps}>
              <Line
                x1={60}
                y1={62}
                x2={60}
                y2={31}
                stroke="white"
                strokeWidth={5}
                strokeLinecap="round"
              />
              <Polyline
                points="52,39 60,31 68,39"
                fill="none"
                stroke="white"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle cx={60} cy={62} r={4.5} fill="white" />
            </AnimatedG>
          </Svg>
        </Animated.View>

        {/* Text anchored just below the icon */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: textTop,
              left: 0,
              width: screenWidth,
              alignItems: 'center',
            },
            wordStyle,
          ]}>
          <Animated.View style={styles.titleRow}>
            <Text style={styles.titleLight}>Slow to </Text>
            <Text style={styles.titleBold}>Pro</Text>
          </Animated.View>
          <Animated.View style={tagStyle}>
            <Text style={styles.tagText}>Tasks · Time · Finance</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    zIndex: 999,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleLight: {
    fontSize: 34,
    fontWeight: '400',
    color: '#E2E8F0',
  },
  titleBold: {
    fontSize: 34,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tagText: {
    marginTop: 10,
    fontSize: 13,
    color: '#475569',
    letterSpacing: 0.8,
  },
});
