import { Image } from 'react-native';

const icons = {
  back: require('../../assets/icons/back.png'),
  camera: require('../../assets/icons/camera.png'),
  chatBubble: require('../../assets/icons/chat_bubble.png'),
  check: require('../../assets/icons/check_mark.png'),
  create: require('../../assets/icons/create.png'),
  cycle: require('../../assets/icons/cycle.png'),
  draft: require('../../assets/icons/draft.png'),
  emptyHeart: require('../../assets/icons/empty_heart.png'),
  following: require('../../assets/icons/following.png'),
  fullHeart: require('../../assets/icons/full_heart.png'),
  gear: require('../../assets/icons/gear.png'),
  home: require('../../assets/icons/home.png'),
  pencil: require('../../assets/icons/pencil.png'),
  profile: require('../../assets/icons/profile.png'),
  reply: require('../../assets/icons/reply.png'),
  search: require('../../assets/icons/search.png'),
  share: require('../../assets/icons/share.png'),
  upload: require('../../assets/icons/upload.png'),
  x: require('../../assets/icons/x.png')
};

const HandDrawnIcon = ({ name, color, size = 24 }) => (
  <Image source={icons[name]} resizeMode="contain" style={{ width: size, height: size, tintColor: color }} />
);

export default HandDrawnIcon;
