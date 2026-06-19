import BackIcon from '../assets/icons/back.svg';
import CameraIcon from '../assets/icons/camera.svg';
import ChatBubbleIcon from '../assets/icons/chat_bubble.svg';
import CheckMarkIcon from '../assets/icons/check_mark.svg';
import CreateIcon from '../assets/icons/create.svg';
import CycleIcon from '../assets/icons/cycle.svg';
import DraftIcon from '../assets/icons/draft.svg';
import EmptyHeartIcon from '../assets/icons/empty_heart.svg';
import FollowingIcon from '../assets/icons/following.svg';
import FullHeartIcon from '../assets/icons/full_heart.svg';
import GearIcon from '../assets/icons/gear.svg';
import HomeIcon from '../assets/icons/home.svg';
import PencilIcon from '../assets/icons/pencil.svg';
import ProfileIcon from '../assets/icons/profile.svg';
import ReplyIcon from '../assets/icons/reply.svg';
import ResizeIcon from '../assets/icons/resize.svg';
import SearchIcon from '../assets/icons/search.svg';
import ShareIcon from '../assets/icons/share.svg';
import TemplateIcon from '../assets/icons/template.svg';
import UploadIcon from '../assets/icons/upload.svg';
import XIcon from '../assets/icons/x.svg';

const ICONS = {
  back: BackIcon,
  camera: CameraIcon,
  chat_bubble: ChatBubbleIcon,
  check_mark: CheckMarkIcon,
  create: CreateIcon,
  cycle: CycleIcon,
  draft: DraftIcon,
  empty_heart: EmptyHeartIcon,
  following: FollowingIcon,
  full_heart: FullHeartIcon,
  gear: GearIcon,
  home: HomeIcon,
  pencil: PencilIcon,
  profile: ProfileIcon,
  reply: ReplyIcon,
  resize: ResizeIcon,
  search: SearchIcon,
  share: ShareIcon,
  template: TemplateIcon,
  upload: UploadIcon,
  x: XIcon,
};

const Icon = ({ name, size = 24, color, style }) => {
  const SvgIcon = ICONS[name];
  if (!SvgIcon) return null;
  return <SvgIcon width={size} height={size} color={color} style={style} />;
};

export default Icon;
