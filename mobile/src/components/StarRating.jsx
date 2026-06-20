import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme.js';
import { MAX_RATING_SCORE, MIN_RATING_SCORE, RATING_SCORE_STEP, ratingForPosition } from '../utils/ratingDisplay.js';

const fillFor = (value, index) => {
  const fill = value - (index - 1);
  return Math.max(0, Math.min(1, fill));
};

const DisplayStar = ({ fill, fontSize }) => {
  const slotSize = fontSize + 2;
  const starStyle = [styles.star, {
    width: slotSize,
    height: slotSize,
    fontSize,
    lineHeight: slotSize
  }];

  return (
    <View style={[styles.starSlot, { width: slotSize, height: slotSize }]}>
      <Text style={[starStyle, styles.emptyStar]}>★</Text>
      {fill > 0 ? (
        <View style={[styles.filledStarClip, { width: slotSize * fill }]}>
          <Text style={starStyle}>★</Text>
        </View>
      ) : null}
    </View>
  );
};

const StarRating = ({
  value = 0,
  interactive = false,
  onChange,
  onPreviewChange,
  size = 'md',
  label
}) => {
  const fontSize = size === 'lg' ? 34 : size === 'sm' ? 17 : 24;
  const roundedValue = Number(value) || 0;
  const [controlWidth, setControlWidth] = useState(0);
  const [hoverValue, setHoverValue] = useState(null);
  const dragValueRef = useRef(null);
  const isDraggingRef = useRef(false);

  if (interactive) {
    const valueFromEvent = (event) => {
      const { nativeEvent } = event;
      const bounds = event.currentTarget?.getBoundingClientRect?.();
      const position = Number.isFinite(nativeEvent.locationX)
        ? nativeEvent.locationX
        : bounds ? nativeEvent.clientX - bounds.left : nativeEvent.offsetX;
      return ratingForPosition(position, controlWidth);
    };
    const updateFromTouch = (event) => onChange?.(valueFromEvent(event));
    const previewEvent = (event) => {
      const nextValue = valueFromEvent(event);
      if (isDraggingRef.current) {
        dragValueRef.current = nextValue;
      }
      setHoverValue(nextValue);
      onPreviewChange?.(nextValue);
    };
    const clearPreview = () => {
      isDraggingRef.current = false;
      dragValueRef.current = null;
      setHoverValue(null);
      onPreviewChange?.(null);
    };
    const commitDrag = () => {
      if (dragValueRef.current != null) {
        onChange?.(dragValueRef.current);
      }
      clearPreview();
    };

    const adjust = (direction) => {
      const next = roundedValue + direction * RATING_SCORE_STEP;
      onChange?.(Math.min(MAX_RATING_SCORE, Math.max(MIN_RATING_SCORE, next)));
    };

    return (
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={label || 'Rating'}
        accessibilityValue={{ min: MIN_RATING_SCORE, max: MAX_RATING_SCORE, now: roundedValue, text: `${roundedValue} out of 5` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => adjust(nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={({ nativeEvent }) => setControlWidth(nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onPress={Platform.OS === 'web' ? updateFromTouch : undefined}
        onTouchStart={Platform.OS !== 'web' ? (event) => {
          isDraggingRef.current = true;
          previewEvent(event);
        } : undefined}
        onTouchMove={Platform.OS !== 'web' ? previewEvent : undefined}
        onTouchEnd={Platform.OS !== 'web' ? commitDrag : undefined}
        onTouchCancel={Platform.OS !== 'web' ? clearPreview : undefined}
        onPointerDown={Platform.OS === 'web' ? (event) => {
          isDraggingRef.current = true;
          event.currentTarget?.setPointerCapture?.(event.nativeEvent.pointerId);
          previewEvent(event);
        } : undefined}
        onPointerMove={Platform.OS === 'web' ? previewEvent : undefined}
        onPointerUp={Platform.OS === 'web' ? (event) => {
          previewEvent(event);
          commitDrag();
        } : undefined}
        onPointerCancel={Platform.OS === 'web' ? clearPreview : undefined}
        onPointerLeave={Platform.OS === 'web' ? () => {
          if (!isDraggingRef.current) {
            clearPreview();
          }
        } : undefined}
        style={styles.interactive}
      >
        <View pointerEvents="none" style={styles.display}>
          {[1, 2, 3, 4, 5].map((index) => (
            <DisplayStar key={index} fill={fillFor(hoverValue ?? roundedValue, index)} fontSize={fontSize} />
          ))}
        </View>
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={label} style={styles.display}>
      {[1, 2, 3, 4, 5].map((index) => (
        <DisplayStar key={index} fill={fillFor(roundedValue, index)} fontSize={fontSize} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  interactive: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { touchAction: 'none' } : {})
  },
  star: {
    color: colors.star,
    fontFamily: 'PlayfairDisplay_400Regular',
    textAlign: 'center'
  },
  starSlot: {
    position: 'relative',
    overflow: 'hidden'
  },
  emptyStar: {
    color: colors.borderStrong
  },
  filledStarClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden'
  }
});

export default StarRating;
