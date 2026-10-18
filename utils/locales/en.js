/**
 * English locale
 * Keys map 1:1 to zh.js — keep both files in sync when changing
 * Terminology (kept consistent across the whole UI):
 *   solitaire = the group sign-up sheet   participant = a person who joined
 *   join = the act of signing up          entry = one person's record
 *   spot = a remaining slot               host = the organiser
 *   deadline / closes = cut-off time      note = optional remark
 */
module.exports = {
  /* ---------- App ---------- */
  'app.name': 'Group Solitaire',

  /* ---------- Language switch ---------- */
  'lang.label': 'Language',
  'lang.switchTo': '中文',
  'lang.switched': 'Switched to Chinese',

  /* ---------- Intro card ---------- */
  'intro.status.open': 'Open',
  'intro.status.full': 'Full',
  'intro.status.expired': 'Closed',
  'intro.status.closed': 'Closed by organiser',
  'intro.host': 'Host',
  'intro.location': 'Location',
  'intro.deadline': 'Deadline',
  'intro.joined': '{n} joined',
  'intro.quotaLeft': '{n} spots left',
  'intro.quotaLeft_one': '1 spot left',
  'intro.quotaUnlimited': 'No limit',
  'intro.closesInDays': 'Closes in {n} days',
  'intro.closesInDays_one': 'Closes in 1 day',
  'intro.closesInHours': 'Closes in {n} hours',
  'intro.closesInHours_one': 'Closes in 1 hour',
  'intro.closesInMinutes': 'Closes in {n} minutes',
  'intro.closed': 'Closed',

  /* ---------- Participant list ---------- */
  'list.title': 'Participants',
  'list.count': '{n} joined',
  'list.emptyTitle': 'No one has joined yet',
  'list.emptySub': 'Tap "Join" below to be the first',
  'list.sourceWechat': 'WeChat',
  'list.sourceManual': 'Manual',
  'list.mine': 'Me',

  /* ---------- Footer actions ---------- */
  'footer.join': 'Join',
  'footer.edit': 'Edit my entry',
  'footer.cancel': 'Cancel',
  'footer.tip': "You're #{n} on the list",

  /* ---------- Host settings (visible to the organiser only) ---------- */
  'owner.badge': 'You are the organiser',
  'owner.manage': 'Manage',
  'owner.panelTitle': 'Host settings',
  'owner.panelSub': 'Only the organiser can edit details, remove entries or transfer the role',
  'owner.editTitle': 'Title',
  'owner.editDesc': 'Description',
  'owner.editQuota': 'Spot limit',
  'owner.quotaPh': '0 for no limit',
  'owner.editDeadline': 'Deadline date',
  'owner.editTime': 'Deadline time',
  'owner.closeAction': 'Close now',
  'owner.reopenAction': 'Reopen',
  'owner.closeConfirmTitle': 'Close solitaire',
  'owner.closeConfirmContent': 'Once closed, others cannot join. You can reopen at any time.',
  'owner.closedToast': 'Closed',
  'owner.reopenedToast': 'Reopened',
  'owner.updatedToast': 'Details updated',
  'owner.transfer': 'Transfer organiser role',
  'owner.transferEmpty': 'No one to transfer to yet',
  'owner.transferConfirmTitle': 'Transfer organiser role',
  'owner.transferConfirmContent': 'Transfer the organiser role to "{n}"? You will lose host access.',
  'owner.transferredToast': 'Organiser role transferred',
  'owner.remove': 'Remove',
  'owner.removeConfirmTitle': 'Remove entry',
  'owner.removeConfirmContent': 'Remove the entry of "{n}"?',
  'owner.removedToast': 'Removed',
  'owner.save': 'Save',

  /* ---------- Join sheet ---------- */
  'sheet.title': 'Join Solitaire',
  'sheet.avatarTitle': 'Tap to choose an avatar',
  'sheet.avatarSub': 'Otherwise your initial is used',
  'sheet.name': 'Name',
  'sheet.required': 'Required',
  'sheet.optional': 'Optional',
  'sheet.tabWechat': 'WeChat nickname',
  'sheet.tabManual': 'Type your name',
  'sheet.namePhWechat': 'Tap to use your WeChat nickname',
  'sheet.namePhManual': 'Enter your name',
  'sheet.quickTitle': 'Use my WeChat nickname',
  'sheet.quickSub': 'Tap, then pick it above the keyboard',
  'sheet.hintWechat': 'Provided by WeChat, no private data collected',
  'sheet.hintManual': 'This name appears in the participant list',
  'sheet.remark': 'Note',
  'sheet.remarkPh': 'e.g. bringing a friend / arriving late',
  'sheet.cancel': 'Cancel',
  'sheet.submit': 'Confirm',

  /* ---------- Messages ---------- */
  'msg.nameRequired': 'Please enter a name',
  'msg.updated': 'Updated',
  'msg.joined': 'Joined',
  'msg.cancelTitle': 'Cancel entry',
  'msg.cancelContent': 'Remove your entry from this solitaire?',
  'msg.modalCancelText': 'Cancel',
  'msg.modalConfirmText': 'Remove',
  'msg.cancelled': 'Entry removed',

  /* ---------- Errors ---------- */
  'err.nameRequired': 'Please enter a name',
  'err.nameTooLong': 'Name must be 20 characters or fewer',
  'err.remarkTooLong': 'Note must be 60 characters or fewer',
  'err.full': 'This solitaire is full',
  'err.expired': 'This solitaire has closed',
  'err.notFound': 'Entry not found',
  'err.cancelFailed': 'Could not remove entry',
  'err.generic': 'Could not join, please try again',
  'err.notOwner': 'Only the organiser can do this',
  'err.ownerProtected': 'That entry belongs to the current organiser — transfer ownership first',
  'err.fieldTooLong': 'Title or description is too long',
  'err.invalidQuota': 'Invalid quota value',
  'err.quotaBelowJoined': 'Quota cannot be lower than the number joined',
  'err.invalidDeadline': 'Invalid deadline',

  /* ---------- Demo data (used on first launch only; user data is never translated) ---------- */
  'demo.title': 'Weekend Badminton',
  'demo.desc': 'Saturday 2pm, courts already booked, ¥40 per person split evenly. Friends are welcome, just note how many are coming.',
  'demo.host': 'Tao',
  'demo.location': 'Galaxy Badminton Hall, Court 3',
  'demo.names': ['Tao', 'Lin', 'AJ'],
  'demo.remarks': ['Host, booked 2 courts', '1 person', 'Bringing a friend'],

  /* ---------- Time ---------- */
  'time.weekdays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'time.months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
}
