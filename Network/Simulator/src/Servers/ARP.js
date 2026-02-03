class ARPTable {
  constructor(timeoutMs = 60000) { // 60 seconds default
    this.timeoutMs = timeoutMs;
    this.table = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), this.timeoutMs);
  }

  // Add or update an entry
  add(ip, mac, type = "dynamic") {
    this.table.set(ip, {
      mac,
      type,
      lastSeen: Date.now()
    });
  }

  // Lookup MAC for an IP
  lookup(ip) {
    const entry = this.table.get(ip);
    if (!entry) return null;

    // Check expiration (dynamic only)
    if (entry.type === "dynamic" &&
        Date.now() - entry.lastSeen > this.timeoutMs) {
      this.table.delete(ip);
      return null;
    }

    return entry.mac;
  }

  // Periodic cleanup
  cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.table.entries()) {
      if (entry.type === "dynamic" &&
          now - entry.lastSeen > this.timeoutMs) {
        this.table.delete(ip);
      }
    }
  }

  // Remove an entry manually
  remove(ip) {
    this.table.delete(ip);
  }

  // View table (for debugging/UI)
  list() {
    return Array.from(this.table.entries()).map(([ip, entry]) => ({
      ip,
      ...entry
    }));
  }
}
export default ARPTable;