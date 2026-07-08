const React = require('react');
const { Text } = require('react-native');

function IconMock({ name, testID, accessibilityLabel, ...rest }) {
  return React.createElement(Text, { testID, accessibilityLabel: accessibilityLabel || name }, name);
}

module.exports = {
  MaterialCommunityIcons: IconMock,
  Ionicons: IconMock,
  MaterialIcons: IconMock,
  FontAwesome: IconMock,
  FontAwesome5: IconMock,
  AntDesign: IconMock,
  Feather: IconMock,
  Entypo: IconMock,
  SimpleLineIcons: IconMock,
  Octicons: IconMock,
  Zocial: IconMock,
  EvilIcons: IconMock,
  Foundation: IconMock,
  createIconSet: () => IconMock,
  createIconSetFromIcoMoon: () => IconMock,
  createIconSetFromFontello: () => IconMock,
};
