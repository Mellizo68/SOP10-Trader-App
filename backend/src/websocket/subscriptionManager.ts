import WebSocket from 'ws'

export interface SubscriptionCallback {
  onSubscribe: (symbol: string) => void
  onUnsubscribe: (symbol: string) => void
}

export class SubscriptionManager {
  private subscriptions: Map<string, Set<string>> = new Map() // symbol -> Set<clientId>
  private clientSubscriptions: Map<string, Set<string>> = new Map() // clientId -> Set<symbol>
  private callbacks: SubscriptionCallback

  constructor(callbacks: SubscriptionCallback) {
    this.callbacks = callbacks
  }

  subscribe(clientId: string, symbol: string): void {
    const normalizedSymbol = symbol.toUpperCase()

    // Add to symbol subscriptions
    if (!this.subscriptions.has(normalizedSymbol)) {
      this.subscriptions.set(normalizedSymbol, new Set())
    }
    this.subscriptions.get(normalizedSymbol)!.add(clientId)

    // Add to client subscriptions
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set())
    }
    this.clientSubscriptions.get(clientId)!.add(normalizedSymbol)

    // Notify if this is the first subscriber for this symbol
    if (this.subscriptions.get(normalizedSymbol)!.size === 1) {
      this.callbacks.onSubscribe(normalizedSymbol)
    }
  }

  unsubscribe(clientId: string, symbol: string): void {
    const normalizedSymbol = symbol.toUpperCase()

    const symbolSubscribers = this.subscriptions.get(normalizedSymbol)
    if (!symbolSubscribers) return

    symbolSubscribers.delete(clientId)

    const clientSymbols = this.clientSubscriptions.get(clientId)
    if (clientSymbols) {
      clientSymbols.delete(normalizedSymbol)
    }

    // Notify if this was the last subscriber for this symbol
    if (symbolSubscribers.size === 0) {
      this.callbacks.onUnsubscribe(normalizedSymbol)
      this.subscriptions.delete(normalizedSymbol)
    }
  }

  removeClient(clientId: string): void {
    const symbols = this.clientSubscriptions.get(clientId)
    if (!symbols) return

    symbols.forEach(symbol => {
      this.unsubscribe(clientId, symbol)
    })

    this.clientSubscriptions.delete(clientId)
  }

  getSubscribersForSymbol(symbol: string): Set<string> {
    const normalizedSymbol = symbol.toUpperCase()
    return this.subscriptions.get(normalizedSymbol) || new Set()
  }

  getSubscribedSymbols(clientId: string): Set<string> {
    return this.clientSubscriptions.get(clientId) || new Set()
  }

  getAllActiveSymbols(): Set<string> {
    return new Set(this.subscriptions.keys())
  }

  hasSubscribers(symbol: string): boolean {
    const normalizedSymbol = symbol.toUpperCase()
    const subscribers = this.subscriptions.get(normalizedSymbol)
    return subscribers ? subscribers.size > 0 : false
  }
}
