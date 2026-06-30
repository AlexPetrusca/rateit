import { forwardRef } from 'react';
import { Linking, Text } from 'react-native';
import { colors } from '../theme.js';

const RICH_REGEX = /\[([^\]]+)\]\(([^)]+)\)|_\*\*(.+?)\*\*_|\*\*_(.+?)_\*\*|\*\*(.+?)\*\*|_(.+?)_|~(.+?)~/g;

const safeHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export const parseRichText = (value) => {
  if (!value) {
    return null;
  }

  const segments = [];
  let lastIndex = 0;
  let key = 0;
  const regex = new RegExp(RICH_REGEX.source, RICH_REGEX.flags);
  let match;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push(value.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      const href = safeHref(match[2]);
      segments.push(
        <Text key={key++} style={styles.link} onPress={() => Linking.openURL(href)}>
          {match[1]}
        </Text>
      );
    } else if (match[3] !== undefined || match[4] !== undefined) {
      segments.push(
        <Text key={key++} style={styles.boldItalic}>
          {match[3] ?? match[4]}
        </Text>
      );
    } else if (match[5] !== undefined) {
      segments.push(
        <Text key={key++} style={styles.bold}>
          {match[5]}
        </Text>
      );
    } else if (match[6] !== undefined) {
      segments.push(
        <Text key={key++} style={styles.italic}>
          {match[6]}
        </Text>
      );
    } else if (match[7] !== undefined) {
      segments.push(
        <Text key={key++} style={styles.underline}>
          {match[7]}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    segments.push(value.slice(lastIndex));
  }

  return segments.length > 0 ? segments : value;
};

const RichText = forwardRef(({ children, style, ...props }, ref) => (
  <Text ref={ref} style={style} {...props}>{parseRichText(children)}</Text>
));

const styles = {
  link: {
    color: colors.link,
    textDecorationLine: 'underline',
    fontWeight: '700'
  },
  bold: {
    color: colors.text,
    fontWeight: '800'
  },
  italic: {
    fontStyle: 'italic'
  },
  boldItalic: {
    color: colors.text,
    fontStyle: 'italic',
    fontWeight: '800'
  },
  underline: {
    textDecorationLine: 'underline'
  }
};

export default RichText;
