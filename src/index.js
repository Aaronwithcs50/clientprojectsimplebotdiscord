require('dotenv').config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { bumpCase } = require('./store');

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  EVENT_LOG_CHANNEL_ID,
  ACCENT_COLOR = '#D7263D'
} = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !EVENT_LOG_CHANNEL_ID) {
  console.error('Missing required environment variables. Check README/.env.example');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) => opt.setName('target').setDescription('Member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) => opt.setName('target').setDescription('Member to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban').setRequired(false)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member and track warning count.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('target').setDescription('Member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(false)),

  new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create a customizable event announcement embed.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((opt) => opt.setName('name').setDescription('Event name/title').setRequired(true))
    .addStringOption((opt) => opt.setName('summary').setDescription('Short event summary line').setRequired(true))
    .addStringOption((opt) => opt.setName('details').setDescription('Detailed event description').setRequired(true))
    .addStringOption((opt) => opt.setName('host').setDescription('Host or team running this event').setRequired(true))
    .addStringOption((opt) => opt.setName('role_ping').setDescription('Role or group being called').setRequired(false))
    .addChannelOption((opt) =>
      opt
        .setName('voice_channel')
        .setDescription('VC required to join (optional)')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)
    )
    .addStringOption((opt) => opt.setName('game_link').setDescription('Game link / server link').setRequired(false))
    .addIntegerOption((opt) => opt.setName('event_number').setDescription('Event ID/number').setMinValue(1).setRequired(false))
    .addStringOption((opt) => opt.setName('color').setDescription('Hex color (#FF5500)').setRequired(false))
    .addStringOption((opt) => opt.setName('thumbnail_url').setDescription('Thumbnail image URL').setRequired(false))
    .addStringOption((opt) => opt.setName('image_url').setDescription('Large image URL').setRequired(false))
    .addStringOption((opt) => opt.setName('footer').setDescription('Footer note').setRequired(false)),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Open a live embed builder (private preview).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a member and update their server role.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) => opt.setName('target').setDescription('Member being promoted').setRequired(true))
    .addRoleOption((opt) => opt.setName('old_rank').setDescription('Current/old rank role').setRequired(true))
    .addRoleOption((opt) => opt.setName('new_rank').setDescription('New rank role').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Promotion reason').setRequired(true))
    .addBooleanOption((opt) =>
      opt
        .setName('announce')
        .setDescription('Post promotion embed publicly (default: true)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a member and update their server role.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) => opt.setName('target').setDescription('Member being demoted').setRequired(true))
    .addRoleOption((opt) => opt.setName('old_rank').setDescription('Current rank role').setRequired(true))
    .addRoleOption((opt) => opt.setName('new_rank').setDescription('Rank after demotion').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Demotion reason').setRequired(true))
    .addBooleanOption((opt) =>
      opt
        .setName('announce')
        .setDescription('Post demotion embed publicly (default: true)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('promotion')
    .setDescription('Alias of /promote.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) => opt.setName('target').setDescription('Member being promoted').setRequired(true))
    .addRoleOption((opt) => opt.setName('old_rank').setDescription('Current/old rank role').setRequired(true))
    .addRoleOption((opt) => opt.setName('new_rank').setDescription('New rank role').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Promotion reason').setRequired(true))
    .addBooleanOption((opt) =>
      opt
        .setName('announce')
        .setDescription('Post promotion embed publicly (default: true)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('demotion')
    .setDescription('Alias of /demote.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) => opt.setName('target').setDescription('Member being demoted').setRequired(true))
    .addRoleOption((opt) => opt.setName('old_rank').setDescription('Current rank role').setRequired(true))
    .addRoleOption((opt) => opt.setName('new_rank').setDescription('Rank after demotion').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Demotion reason').setRequired(true))
    .addBooleanOption((opt) =>
      opt
        .setName('announce')
        .setDescription('Post demotion embed publicly (default: true)')
        .setRequired(false)
    )
].map((c) => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const embedSessions = new Map();

function createEmbedBuilderComponents(sessionId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`embed:author:${sessionId}`).setLabel('Edit Author').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`embed:body:${sessionId}`).setLabel('Edit Body').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`embed:images:${sessionId}`).setLabel('Edit Images').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`embed:footer:${sessionId}`).setLabel('Edit Footer').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`embed:post:${sessionId}`).setLabel('Post Embed').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`embed:reset:${sessionId}`).setLabel('Reset').setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildPreviewEmbed(data) {
  const embed = new EmbedBuilder().setColor(data.color || ACCENT_COLOR);

  if (data.title) embed.setTitle(data.title);
  if (data.url) embed.setURL(data.url);
  if (data.description) embed.setDescription(data.description);
  if (data.authorName) {
    embed.setAuthor({
      name: data.authorName,
      ...(data.authorUrl ? { url: data.authorUrl } : {}),
      ...(data.authorIconUrl ? { iconURL: data.authorIconUrl } : {})
    });
  }
  if (data.imageUrl) embed.setImage(data.imageUrl);
  if (data.thumbnailUrl) embed.setThumbnail(data.thumbnailUrl);
  if (data.footerText) {
    embed.setFooter({
      text: data.footerText,
      ...(data.footerIconUrl ? { iconURL: data.footerIconUrl } : {})
    });
  }
  if (data.timestamp) embed.setTimestamp();
  return embed;
}

function createEmbedBuilderModal(type, sessionId, data) {
  const modal = new ModalBuilder().setCustomId(`embedmodal:${type}:${sessionId}`).setTitle(`Edit ${type}`);

  if (type === 'author') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('author_name').setLabel('Author').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(256).setValue(data.authorName || '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('author_url').setLabel('Author URL').setStyle(TextInputStyle.Short).setRequired(false).setValue(data.authorUrl || '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('author_icon_url').setLabel('Author Icon URL').setStyle(TextInputStyle.Short).setRequired(false).setValue(data.authorIconUrl || '')
      )
    );
    return modal;
  }

  if (type === 'body') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(256).setValue(data.title || '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(4096).setValue(data.description || '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('url').setLabel('URL').setStyle(TextInputStyle.Short).setRequired(false).setValue(data.url || '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('color').setLabel('Color (hex)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('#5865F2').setValue(data.color || '')
      )
    );
    return modal;
  }

  if (type === 'images') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('image_url').setLabel('Image URL').setStyle(TextInputStyle.Short).setRequired(false).setValue(data.imageUrl || '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('thumbnail_url').setLabel('Thumbnail URL').setStyle(TextInputStyle.Short).setRequired(false).setValue(data.thumbnailUrl || '')
      )
    );
    return modal;
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('footer').setLabel('Footer').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(2048).setValue(data.footerText || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('footer_icon_url').setLabel('Footer Icon URL').setStyle(TextInputStyle.Short).setRequired(false).setValue(data.footerIconUrl || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('timestamp').setLabel('Timestamp (on/off)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('on').setValue(data.timestamp ? 'on' : '')
    )
  );
  return modal;
}

async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log(`Registered ${commands.length} guild slash commands to guild ${GUILD_ID}`);
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(`Registered ${commands.length} global slash commands (can take up to 1 hour to update).`);
  }
}

function isProtectedTarget(interaction, member) {
  if (!member) return false;

  // Stop actions against server owner, administrators, and self-target attempts.
  if (member.id === interaction.guild.ownerId) return 'You cannot moderate the server owner.';
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return 'You cannot moderate an administrator.';
  }
  if (member.id === interaction.user.id) return 'You cannot target yourself with this command.';
  return false;
}

async function handleKick(interaction) {
  const target = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!target) return interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
  const blocked = isProtectedTarget(interaction, target);
  if (blocked) return interaction.reply({ content: blocked, ephemeral: true });
  if (!target.kickable) return interaction.reply({ content: 'I cannot kick that member (role hierarchy).', ephemeral: true });

  const caseInfo = bumpCase(interaction.guildId, target.id, 'kick', {
    moderatorId: interaction.user.id,
    reason
  });

  await target.kick(reason);

  const embed = new EmbedBuilder()
    .setColor('#ff7b00')
    .setTitle('👢 Member Kicked')
    .setDescription(`${target.user.tag} has been removed from the server.`)
    .addFields(
      { name: 'Case', value: `
${caseInfo.caseId.toUpperCase()}`.trim(), inline: true },
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Reason', value: reason },
      {
        name: 'Record Totals',
        value: `Warns: **${caseInfo.counts.warns}** | Kicks: **${caseInfo.counts.kicks}** | Bans: **${caseInfo.counts.bans}**`
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleBan(interaction) {
  const target = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!target) return interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
  const blocked = isProtectedTarget(interaction, target);
  if (blocked) return interaction.reply({ content: blocked, ephemeral: true });
  if (!target.bannable) return interaction.reply({ content: 'I cannot ban that member (role hierarchy).', ephemeral: true });

  const caseInfo = bumpCase(interaction.guildId, target.id, 'ban', {
    moderatorId: interaction.user.id,
    reason
  });

  await target.ban({ reason, deleteMessageSeconds: 60 * 60 });

  const embed = new EmbedBuilder()
    .setColor('#b00020')
    .setTitle('🔨 Member Banned')
    .setDescription(`${target.user.tag} has been banned from the server.`)
    .addFields(
      { name: 'Case', value: caseInfo.caseId.toUpperCase(), inline: true },
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Reason', value: reason },
      {
        name: 'Record Totals',
        value: `Warns: **${caseInfo.counts.warns}** | Kicks: **${caseInfo.counts.kicks}** | Bans: **${caseInfo.counts.bans}**`
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleWarn(interaction) {
  const target = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!target) return interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
  const blocked = isProtectedTarget(interaction, target);
  if (blocked) return interaction.reply({ content: blocked, ephemeral: true });

  const caseInfo = bumpCase(interaction.guildId, target.id, 'warn', {
    moderatorId: interaction.user.id,
    reason
  });

  const embed = new EmbedBuilder()
    .setColor('#f4b400')
    .setTitle('⚠️ Member Warned')
    .setDescription(`${target} has received a warning.`)
    .addFields(
      { name: 'Warning Case', value: caseInfo.caseId.toUpperCase(), inline: true },
      { name: 'Moderator', value: `${interaction.user}`, inline: true },
      { name: 'Reason', value: reason },
      { name: 'Total Warnings', value: `**${caseInfo.counts.warns}**`, inline: true }
    )
    .setFooter({ text: `User ID: ${target.id}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // DM the warned user but don't fail command if DMs are closed.
  target.send(`You were warned in **${interaction.guild.name}** (${caseInfo.caseId.toUpperCase()}): ${reason}`).catch(() => {});
}

async function handleEvent(interaction) {
  const eventName = interaction.options.getString('name', true);
  const summary = interaction.options.getString('summary', true);
  const details = interaction.options.getString('details', true);
  const host = interaction.options.getString('host', true);
  const rolePing = interaction.options.getString('role_ping') || 'All eligible members';
  const voiceChannel = interaction.options.getChannel('voice_channel');
  const gameLink = interaction.options.getString('game_link') || 'Not provided';
  const eventNumber = interaction.options.getInteger('event_number');
  const color = interaction.options.getString('color') || ACCENT_COLOR;
  const thumbnailUrl = interaction.options.getString('thumbnail_url');
  const imageUrl = interaction.options.getString('image_url');
  const footer = interaction.options.getString('footer') || 'Event system powered by Discord.js v14';

  const eventEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎯 ${eventName}`)
    .setDescription(`**${summary}**\n\n${details}`)
    .addFields(
      { name: '👤 Hosted By', value: host, inline: true },
      { name: '📣 Role Calls', value: rolePing, inline: true },
      { name: '🔊 Required VC', value: voiceChannel ? `${voiceChannel}` : 'No VC required', inline: false },
      { name: '🎮 Event/Game Link', value: gameLink, inline: false }
    )
    .setFooter({ text: `${footer}${eventNumber ? ` • Event #${eventNumber}` : ''}` })
    .setTimestamp();

  if (thumbnailUrl) eventEmbed.setThumbnail(thumbnailUrl);
  if (imageUrl) eventEmbed.setImage(imageUrl);

  await interaction.channel.send({ embeds: [eventEmbed] });

  const logChannel = await interaction.guild.channels.fetch(EVENT_LOG_CHANNEL_ID).catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🧾 Event Command Log')
      .addFields(
        { name: 'Created By', value: `${interaction.user} (${interaction.user.id})` },
        { name: 'Guild Channel', value: `${interaction.channel} (${interaction.channelId})` },
        { name: 'Event Name', value: eventName, inline: true },
        { name: 'Host', value: host, inline: true },
        { name: 'Role Ping', value: rolePing, inline: true },
        { name: 'Summary', value: summary },
        { name: 'Details', value: details },
        { name: 'Required VC', value: voiceChannel ? `${voiceChannel.name} (${voiceChannel.id})` : 'None' },
        { name: 'Game Link', value: gameLink },
        { name: 'Event Number', value: eventNumber ? String(eventNumber) : 'Not provided', inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  }

  await interaction.reply({ content: 'Event posted and logged successfully.', ephemeral: true });
}

async function handlePromote(interaction) {
  const target = interaction.options.getMember('target');
  const oldRank = interaction.options.getRole('old_rank', true);
  const newRank = interaction.options.getRole('new_rank', true);
  const reason = interaction.options.getString('reason', true);
  const announce = interaction.options.getBoolean('announce') ?? true;

  if (!target) return interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
  if (!target.manageable) {
    return interaction.reply({ content: 'I cannot update this member’s rank due to role hierarchy.', ephemeral: true });
  }
  if (!oldRank.editable || !newRank.editable) {
    return interaction.reply({
      content: 'I cannot manage one or both selected rank roles due to role hierarchy/permissions.',
      ephemeral: true
    });
  }
  if (oldRank.id === newRank.id) {
    return interaction.reply({ content: 'Old rank and new rank must be different roles.', ephemeral: true });
  }

  if (!target.roles.cache.has(oldRank.id)) {
    return interaction.reply({ content: `${target} does not currently have ${oldRank}.`, ephemeral: true });
  }

  await target.roles.remove(oldRank, `Promotion by ${interaction.user.tag}: ${reason}`);
  await target.roles.add(newRank, `Promotion by ${interaction.user.tag}: ${reason}`);

  const embed = new EmbedBuilder()
    .setColor('#3BA55D')
    .setTitle('📈 Staff Promotion')
    .setDescription(`${target} has been promoted in the server hierarchy.`)
    .addFields(
      { name: 'From', value: `${oldRank}`, inline: true },
      { name: 'To', value: `${newRank}`, inline: true },
      { name: 'Approved By', value: `${interaction.user}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setFooter({ text: 'Congratulations and keep up the great work!' })
    .setTimestamp();

  if (announce) {
    await interaction.reply({ embeds: [embed] });
    return;
  }

  await interaction.reply({ content: `${target} promoted: ${oldRank} → ${newRank}.`, ephemeral: true });
}

async function handleDemote(interaction) {
  const target = interaction.options.getMember('target');
  const oldRank = interaction.options.getRole('old_rank', true);
  const newRank = interaction.options.getRole('new_rank', true);
  const reason = interaction.options.getString('reason', true);
  const announce = interaction.options.getBoolean('announce') ?? true;

  if (!target) return interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
  if (!target.manageable) {
    return interaction.reply({ content: 'I cannot update this member’s rank due to role hierarchy.', ephemeral: true });
  }
  if (!oldRank.editable || !newRank.editable) {
    return interaction.reply({
      content: 'I cannot manage one or both selected rank roles due to role hierarchy/permissions.',
      ephemeral: true
    });
  }
  if (oldRank.id === newRank.id) {
    return interaction.reply({ content: 'Old rank and new rank must be different roles.', ephemeral: true });
  }

  if (!target.roles.cache.has(oldRank.id)) {
    return interaction.reply({ content: `${target} does not currently have ${oldRank}.`, ephemeral: true });
  }

  await target.roles.remove(oldRank, `Demotion by ${interaction.user.tag}: ${reason}`);
  await target.roles.add(newRank, `Demotion by ${interaction.user.tag}: ${reason}`);

  const embed = new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('📉 Staff Demotion')
    .setDescription(`${target} has received a roster adjustment.`)
    .addFields(
      { name: 'From', value: `${oldRank}`, inline: true },
      { name: 'To', value: `${newRank}`, inline: true },
      { name: 'Issued By', value: `${interaction.user}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setFooter({ text: 'If needed, contact leadership for next steps.' })
    .setTimestamp();

  if (announce) {
    await interaction.reply({ embeds: [embed] });
    return;
  }

  await interaction.reply({ content: `${target} demoted: ${oldRank} → ${newRank}.`, ephemeral: true });
}

async function handleEmbedCommand(interaction) {
  const sessionId = `${interaction.user.id}-${Date.now().toString(36)}`;
  embedSessions.set(sessionId, {
    userId: interaction.user.id,
    channelId: interaction.channelId,
    data: { color: ACCENT_COLOR }
  });

  await interaction.reply({
    content: 'Live embed builder (private preview). Update sections below to see changes in real time.',
    embeds: [buildPreviewEmbed(embedSessions.get(sessionId).data)],
    components: createEmbedBuilderComponents(sessionId),
    ephemeral: true
  });
}

async function handleEmbedButton(interaction) {
  const [namespace, action, sessionId] = interaction.customId.split(':');
  if (namespace !== 'embed') return;

  const session = embedSessions.get(sessionId);
  if (!session) {
    await interaction.reply({ content: 'This builder session expired. Run /embed again.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({ content: 'Only the user who started this builder can use it.', ephemeral: true });
    return;
  }

  if (action === 'post') {
    const finalEmbed = buildPreviewEmbed(session.data);
    await interaction.channel.send({ embeds: [finalEmbed] });
    await interaction.reply({ content: 'Embed posted to this channel.', ephemeral: true });
    return;
  }

  if (action === 'reset') {
    session.data = { color: ACCENT_COLOR };
    await interaction.update({
      content: 'Live embed builder (private preview). Update sections below to see changes in real time.',
      embeds: [buildPreviewEmbed(session.data)],
      components: createEmbedBuilderComponents(sessionId)
    });
    return;
  }

  const modal = createEmbedBuilderModal(action, sessionId, session.data);
  await interaction.showModal(modal);
}

async function handleEmbedModal(interaction) {
  const [namespace, type, sessionId] = interaction.customId.split(':');
  if (namespace !== 'embedmodal') return;

  const session = embedSessions.get(sessionId);
  if (!session) {
    await interaction.reply({ content: 'This builder session expired. Run /embed again.', ephemeral: true });
    return;
  }
  if (interaction.user.id !== session.userId) {
    await interaction.reply({ content: 'Only the user who started this builder can use it.', ephemeral: true });
    return;
  }

  if (type === 'author') {
    session.data.authorName = interaction.fields.getTextInputValue('author_name').trim();
    session.data.authorUrl = interaction.fields.getTextInputValue('author_url').trim();
    session.data.authorIconUrl = interaction.fields.getTextInputValue('author_icon_url').trim();
  } else if (type === 'body') {
    session.data.title = interaction.fields.getTextInputValue('title').trim();
    session.data.description = interaction.fields.getTextInputValue('description').trim();
    session.data.url = interaction.fields.getTextInputValue('url').trim();
    session.data.color = interaction.fields.getTextInputValue('color').trim() || ACCENT_COLOR;
  } else if (type === 'images') {
    session.data.imageUrl = interaction.fields.getTextInputValue('image_url').trim();
    session.data.thumbnailUrl = interaction.fields.getTextInputValue('thumbnail_url').trim();
  } else {
    session.data.footerText = interaction.fields.getTextInputValue('footer').trim();
    session.data.footerIconUrl = interaction.fields.getTextInputValue('footer_icon_url').trim();
    const timestampRaw = interaction.fields.getTextInputValue('timestamp').trim().toLowerCase();
    session.data.timestamp = ['true', 'yes', 'on', '1', 'now'].includes(timestampRaw);
  }

  await interaction.update({
    content: 'Live embed builder (private preview). Update sections below to see changes in real time.',
    embeds: [buildPreviewEmbed(session.data)],
    components: createEmbedBuilderComponents(sessionId)
  });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await registerSlashCommands();
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      await handleEmbedButton(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleEmbedModal(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case 'kick':
        await handleKick(interaction);
        break;
      case 'ban':
        await handleBan(interaction);
        break;
      case 'warn':
        await handleWarn(interaction);
        break;
      case 'event':
        await handleEvent(interaction);
        break;
      case 'embed':
        await handleEmbedCommand(interaction);
        break;
      case 'promote':
      case 'promotion':
        await handlePromote(interaction);
        break;
      case 'demote':
      case 'demotion':
        await handleDemote(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    console.error(`Command error for /${interaction.commandName}:`, error);

    const errReply = { content: 'An error occurred while executing this command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errReply).catch(() => {});
    } else {
      await interaction.reply(errReply).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
