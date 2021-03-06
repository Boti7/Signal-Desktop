// The idea with this file is to make it webpackable for the style guide

const { bindActionCreators } = require('redux');
const Backbone = require('../../ts/backbone');
const Crypto = require('./crypto');
const Data = require('./data');
const Database = require('./database');
const Emoji = require('../../ts/util/emoji');
const IndexedDB = require('./indexeddb');
const Notifications = require('../../ts/notifications');
const OS = require('../../ts/OS');
const Settings = require('./settings');
const Util = require('../../ts/util');
const { migrateToSQL } = require('./migrate_to_sql');
const Metadata = require('./metadata/SecretSessionCipher');
const RefreshSenderCertificate = require('./refresh_sender_certificate');
const LinkPreviews = require('./link_previews');
const AttachmentDownloads = require('./attachment_downloads');

// Components
const {
  AttachmentList,
} = require('../../ts/components/conversation/AttachmentList');
const { CaptionEditor } = require('../../ts/components/CaptionEditor');
const {
  ContactDetail,
} = require('../../ts/components/conversation/ContactDetail');
const { ContactListItem } = require('../../ts/components/ContactListItem');
const { ContactName } = require('../../ts/components/conversation/ContactName');
const {
  ConversationHeader,
} = require('../../ts/components/conversation/ConversationHeader');
const {
  EmbeddedContact,
} = require('../../ts/components/conversation/EmbeddedContact');
const { Emojify } = require('../../ts/components/conversation/Emojify');
const {
  GroupNotification,
} = require('../../ts/components/conversation/GroupNotification');
const { Lightbox } = require('../../ts/components/Lightbox');
const { LightboxGallery } = require('../../ts/components/LightboxGallery');
const {
  MediaGallery,
} = require('../../ts/components/conversation/media-gallery/MediaGallery');
const { Message } = require('../../ts/components/conversation/Message');
const { MessageBody } = require('../../ts/components/conversation/MessageBody');
const {
  MessageDetail,
} = require('../../ts/components/conversation/MessageDetail');
const { Quote } = require('../../ts/components/conversation/Quote');
const {
  ResetSessionNotification,
} = require('../../ts/components/conversation/ResetSessionNotification');
const {
  SafetyNumberNotification,
} = require('../../ts/components/conversation/SafetyNumberNotification');
const {
  StagedLinkPreview,
} = require('../../ts/components/conversation/StagedLinkPreview');
const {
  TimerNotification,
} = require('../../ts/components/conversation/TimerNotification');
const {
  TypingBubble,
} = require('../../ts/components/conversation/TypingBubble');
const {
  VerificationNotification,
} = require('../../ts/components/conversation/VerificationNotification');

// State
const { createLeftPane } = require('../../ts/state/roots/createLeftPane');
const { createStore } = require('../../ts/state/createStore');
const conversationsDuck = require('../../ts/state/ducks/conversations');
const userDuck = require('../../ts/state/ducks/user');

// Migrations
const {
  getPlaceholderMigrations,
  getCurrentVersion,
} = require('./migrations/get_placeholder_migrations');
const { run } = require('./migrations/migrations');

// Types
const AttachmentType = require('./types/attachment');
const VisualAttachment = require('./types/visual_attachment');
const Contact = require('../../ts/types/Contact');
const Conversation = require('./types/conversation');
const Errors = require('./types/errors');
const MediaGalleryMessage = require('../../ts/components/conversation/media-gallery/types/Message');
const MessageType = require('./types/message');
const MIME = require('../../ts/types/MIME');
const PhoneNumber = require('../../ts/types/PhoneNumber');
const SettingsType = require('../../ts/types/Settings');

// Views
const Initialization = require('./views/initialization');

// Workflow
const { IdleDetector } = require('./idle_detector');
const MessageDataMigrator = require('./messages_data_migrator');

function initializeMigrations({
  userDataPath,
  getRegionCode,
  Attachments,
  Type,
  VisualType,
  logger,
}) {
  if (!Attachments) {
    return null;
  }
  const {
    getPath,
    createReader,
    createAbsolutePathGetter,
    createWriterForNew,
    createWriterForExisting,
  } = Attachments;
  const {
    makeObjectUrl,
    revokeObjectUrl,
    getImageDimensions,
    makeImageThumbnail,
    makeVideoScreenshot,
  } = VisualType;

  const attachmentsPath = getPath(userDataPath);
  const readAttachmentData = createReader(attachmentsPath);
  const loadAttachmentData = Type.loadData(readAttachmentData);
  const loadPreviewData = MessageType.loadPreviewData(loadAttachmentData);
  const loadQuoteData = MessageType.loadQuoteData(loadAttachmentData);
  const getAbsoluteAttachmentPath = createAbsolutePathGetter(attachmentsPath);
  const deleteOnDisk = Attachments.createDeleter(attachmentsPath);
  const writeNewAttachmentData = createWriterForNew(attachmentsPath);

  return {
    attachmentsPath,
    deleteAttachmentData: deleteOnDisk,
    deleteExternalMessageFiles: MessageType.deleteAllExternalFiles({
      deleteAttachmentData: Type.deleteData(deleteOnDisk),
      deleteOnDisk,
    }),
    getAbsoluteAttachmentPath,
    getPlaceholderMigrations,
    getCurrentVersion,
    loadAttachmentData,
    loadMessage: MessageType.createAttachmentLoader(loadAttachmentData),
    loadPreviewData,
    loadQuoteData,
    readAttachmentData,
    run,
    processNewAttachment: attachment =>
      MessageType.processNewAttachment(attachment, {
        writeNewAttachmentData,
        getAbsoluteAttachmentPath,
        makeObjectUrl,
        revokeObjectUrl,
        getImageDimensions,
        makeImageThumbnail,
        makeVideoScreenshot,
        logger,
      }),
    upgradeMessageSchema: (message, options = {}) => {
      const { maxVersion } = options;

      return MessageType.upgradeSchema(message, {
        writeNewAttachmentData,
        getRegionCode,
        getAbsoluteAttachmentPath,
        makeObjectUrl,
        revokeObjectUrl,
        getImageDimensions,
        makeImageThumbnail,
        makeVideoScreenshot,
        logger,
        maxVersion,
      });
    },
    writeMessageAttachments: MessageType.createAttachmentDataWriter({
      writeExistingAttachmentData: createWriterForExisting(attachmentsPath),
      logger,
    }),
    writeNewAttachmentData: createWriterForNew(attachmentsPath),
  };
}

exports.setup = (options = {}) => {
  const { Attachments, userDataPath, getRegionCode, logger } = options;

  const Migrations = initializeMigrations({
    userDataPath,
    getRegionCode,
    Attachments,
    Type: AttachmentType,
    VisualType: VisualAttachment,
    logger,
  });

  const Components = {
    AttachmentList,
    CaptionEditor,
    ContactDetail,
    ContactListItem,
    ContactName,
    ConversationHeader,
    EmbeddedContact,
    Emojify,
    GroupNotification,
    Lightbox,
    LightboxGallery,
    MediaGallery,
    Message,
    MessageBody,
    MessageDetail,
    Quote,
    ResetSessionNotification,
    SafetyNumberNotification,
    StagedLinkPreview,
    TimerNotification,
    Types: {
      Message: MediaGalleryMessage,
    },
    TypingBubble,
    VerificationNotification,
  };

  const Roots = {
    createLeftPane,
  };
  const Ducks = {
    conversations: conversationsDuck,
    user: userDuck,
  };
  const State = {
    bindActionCreators,
    createStore,
    Roots,
    Ducks,
  };

  const Types = {
    Attachment: AttachmentType,
    Contact,
    Conversation,
    Errors,
    Message: MessageType,
    MIME,
    PhoneNumber,
    Settings: SettingsType,
    VisualAttachment,
  };

  const Views = {
    Initialization,
  };

  const Workflow = {
    IdleDetector,
    MessageDataMigrator,
  };

  return {
    AttachmentDownloads,
    Backbone,
    Components,
    Crypto,
    Data,
    Database,
    Emoji,
    IndexedDB,
    LinkPreviews,
    Metadata,
    migrateToSQL,
    Migrations,
    Notifications,
    OS,
    RefreshSenderCertificate,
    Settings,
    State,
    Types,
    Util,
    Views,
    Workflow,
  };
};
