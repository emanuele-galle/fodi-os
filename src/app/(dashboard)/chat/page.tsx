'use client'

import { MessageCircle, Video, Hash, Users, Search, Info, X, CheckSquare } from 'lucide-react'
import { ChannelList } from '@/components/chat/ChannelList'
import { MessageThread } from '@/components/chat/MessageThread'
import { MessageInput } from '@/components/chat/MessageInput'
import { NewChannelModal } from '@/components/chat/NewChannelModal'
import { ChannelInfoPanel } from '@/components/chat/ChannelInfoPanel'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/useChat'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export default function ChatPage() {
  const chat = useChat()

  return (
    <div className="flex h-[calc(100vh-7.5rem)] md:h-[calc(100vh-4rem)] h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] -mx-4 -mt-4 -mb-20 md:-mx-6 md:-mt-6 md:-mb-6 relative overflow-hidden">
      {/* Left panel - Channel list */}
      <div className={`w-full md:w-[320px] lg:w-[340px] border-r border-border/50 flex-shrink-0 bg-card/95 backdrop-blur-sm ${chat.selectedId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        {chat.channelError && (
          <div className="mx-3 mt-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">{chat.channelError}</p>
            <button onClick={() => chat.fetchChannels()} className="text-xs font-medium text-destructive hover:underline flex-shrink-0 ml-2">Riprova</button>
          </div>
        )}
        <ChannelList
          channels={chat.channels}
          selectedId={chat.selectedId}
          onSelect={chat.handleSelectChannel}
          onNewChannel={() => chat.setModalOpen(true)}
          teamMembers={chat.teamMembers}
          currentUserId={chat.currentUserId}
          onStartDM={chat.handleStartDM}
        />
      </div>

      {/* Right panel - Messages */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background ${!chat.selectedId ? 'hidden md:flex' : 'flex'}`}>
        {chat.selectedId ? (
          <>
            {/* Channel header */}
            <div className="border-b border-border/50 px-4 md:px-6 py-2.5 flex items-center gap-3 bg-card/80 backdrop-blur-sm">
              <button
                onClick={chat.handleBack}
                className="md:hidden p-1.5 rounded-lg hover:bg-secondary/80 mr-1 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {chat.selectedChannel?.type === 'DIRECT' ? (
                    <Users className="h-4 w-4 text-primary" />
                  ) : (
                    <Hash className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[15px] truncate leading-tight">
                    {chat.selectedChannel?.name || 'Chat'}
                  </h2>
                  <span className="text-[11px] text-muted-foreground/60 font-medium">
                    {chat.typingNames.length > 0
                      ? (
                        <span className="text-primary/70 animate-pulse">
                          {chat.typingNames.length === 1
                            ? `${chat.typingNames[0]} sta scrivendo...`
                            : `${chat.typingNames.join(', ')} stanno scrivendo...`}
                        </span>
                      )
                      : chat.selectedChannel?.type === 'DIRECT'
                        ? chat.dmOtherOnline
                          ? <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />Online</span>
                          : <span className="text-muted-foreground/50">{chat.dmLastSeen || 'Messaggio diretto'}</span>
                        : `${chat.selectedChannel?.memberCount || 0} membri`
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                <button
                  onClick={() => chat.selectionMode ? chat.exitSelectionMode() : chat.setSelectionMode(true)}
                  className={cn(
                    'h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all duration-150 touch-manipulation',
                    chat.selectionMode ? 'bg-destructive/10 text-destructive' : 'text-foreground/60 hover:bg-secondary/80 hover:text-foreground'
                  )}
                  title={chat.selectionMode ? 'Esci dalla selezione' : 'Seleziona messaggi'}
                >
                  <CheckSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
                <button
                  onClick={() => { chat.setSearchOpen(!chat.searchOpen); if (chat.searchOpen) { chat.handleSearch('') } }}
                  className={cn(
                    'h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all duration-150 touch-manipulation',
                    chat.searchOpen ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-secondary/80 hover:text-foreground'
                  )}
                  title="Cerca messaggi"
                >
                  <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
                <button
                  onClick={() => chat.setShowInfoPanel(!chat.showInfoPanel)}
                  className={cn(
                    'h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all duration-150 touch-manipulation',
                    chat.showInfoPanel ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-secondary/80 hover:text-foreground'
                  )}
                  title="Info canale"
                >
                  <Info className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
                <button
                  onClick={chat.handleQuickMeet}
                  disabled={chat.creatingMeet}
                  className="inline-flex items-center gap-1.5 h-10 md:h-8 px-3 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary text-foreground/80 hover:text-foreground transition-all duration-150 disabled:opacity-50 touch-manipulation"
                >
                  <Video className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  <span className="hidden sm:inline">{chat.creatingMeet ? 'Avvio...' : 'Meet'}</span>
                </button>
              </div>
            </div>

            {/* Search bar */}
            {chat.searchOpen && (
              <div className="border-b border-border/30 px-4 md:px-6 py-2 bg-secondary/20">
                <div className="flex items-center gap-2 max-w-2xl">
                  <Search className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  <input
                    type="text"
                    value={chat.searchQuery}
                    onChange={(e) => chat.handleSearch(e.target.value)}
                    placeholder="Cerca nei messaggi..."
                    className="flex-1 bg-transparent text-base md:text-sm outline-none placeholder:text-muted-foreground/40"
                    autoFocus
                  />
                  {chat.searchQuery && (
                    <button
                      onClick={() => chat.handleSearch('')}
                      className="text-muted-foreground/40 hover:text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {chat.searchResults.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                    {chat.searchResults.map((msg) => (
                      <div key={msg.id} className="px-3 py-2 rounded-lg bg-card/60 hover:bg-card transition-colors text-sm">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-[12px]">
                            {msg.author.firstName} {msg.author.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40">
                            {new Date(msg.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground/80 text-[13px] line-clamp-2">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {chat.searching && (
                  <p className="mt-2 text-xs text-muted-foreground/50 animate-pulse">Ricerca in corso...</p>
                )}
                {chat.searchQuery.length >= 2 && !chat.searching && chat.searchResults.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground/50">Nessun risultato trovato</p>
                )}
              </div>
            )}

            <MessageThread
              channelId={chat.selectedId}
              currentUserId={chat.currentUserId}
              newMessages={chat.newMessages}
              readStatus={chat.readStatus}
              onEditMessage={chat.handleEditMessage}
              onDeleteMessage={chat.handleDeleteMessage}
              onReply={chat.handleReply}
              onReact={chat.handleReact}
              userRole={chat.currentUserRole}
              selectionMode={chat.selectionMode}
              selectedMessages={chat.selectedMessages}
              onToggleSelection={chat.toggleMessageSelection}
            />
            {/* Floating selection bar */}
            {chat.selectionMode && chat.selectedMessages.size > 0 && (
              <div className="px-4 py-2.5 md:py-2 bg-card border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {chat.selectedMessages.size} messaggi selezionati
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={chat.exitSelectionMode}
                    className="px-4 py-2 md:px-3 md:py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 transition-colors min-h-[44px] md:min-h-0 touch-manipulation"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={chat.handleBulkDelete}
                    className="px-4 py-2 md:px-3 md:py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors min-h-[44px] md:min-h-0 touch-manipulation"
                  >
                    Elimina ({chat.selectedMessages.size})
                  </button>
                </div>
              </div>
            )}
            {chat.sendError && (
              <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center justify-between">
                <p className="text-xs text-destructive">{chat.sendError}</p>
                <button onClick={() => chat.setSendError(null)} className="text-xs text-destructive hover:underline ml-2 flex-shrink-0">Chiudi</button>
              </div>
            )}
            <MessageInput
              onSend={chat.handleSend}
              onSendFile={chat.handleSendFile}
              onTyping={chat.handleTyping}
              replyTo={chat.replyTo}
              onCancelReply={chat.clearReply}
              disabled={chat.sending}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
            <div className="text-center px-6">
              <div className="h-16 w-16 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/80 mb-1">Chat Team</h3>
              <p className="text-sm text-muted-foreground/60 max-w-xs">
                Seleziona un canale per iniziare a chattare, oppure creane uno nuovo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info panel */}
      {chat.showInfoPanel && chat.selectedId && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-foreground/50" onClick={() => chat.setShowInfoPanel(false)} />
          <div className="fixed md:relative inset-y-0 right-0 z-50 md:z-auto">
            <ChannelInfoPanel
              channelId={chat.selectedId}
              currentUserId={chat.currentUserId}
              currentUserRole={chat.currentUserRole}
              teamMembers={chat.teamMembers}
              onClose={() => chat.setShowInfoPanel(false)}
              onDeleteChannel={(id) => {
                chat.setSelectedId(null)
                chat.setShowInfoPanel(false)
                chat.setNewMessages([])
                chat.setChannels((prev) => prev.filter((ch) => ch.id !== id))
              }}
            />
          </div>
        </>
      )}

      <NewChannelModal
        open={chat.modalOpen}
        onClose={() => chat.setModalOpen(false)}
        onCreated={chat.handleChannelCreated}
        teamMembers={chat.teamMembers}
        currentUserId={chat.currentUserId}
      />
    </div>
  )
}
