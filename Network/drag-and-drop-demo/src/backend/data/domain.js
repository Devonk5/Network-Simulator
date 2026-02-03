/**
 * Represents a domain with multiple user mailboxes
 */
class Domain {
    constructor(name) {
        this.name = name;
        this.mailboxes = new Map(); // userId -> Mailbox[]
    }

    /**
     * Add a mailbox for a user
     * @param {string} userId - The user ID
     * @param {Mailbox} mailbox - The mailbox object
     */
    addMailbox(user) {
        this.mailboxes.set(user, []);
    }
    addMessageToMailbox(user, message = []) {
        const mailbox = this.mailboxes.get(user);
        const read = false;
        message.push(read)
        console.log('Message:', message)
        if (mailbox) {
            mailbox.push([read, message]);
        }
    }
    deleteMessageFromMailbox(user, message) {
        const mailbox = this.mailboxes.get(user);
        if (mailbox) {
            const messageIndex = mailbox.indexOf(message);
            if (messageIndex >= 0 && messageIndex < mailbox.length) {
                mailbox.splice(messageIndex, messageIndex);
            }
        }
    }
    /**
     * Get a user's mailbox
     * @param {string} userId - The user ID
     * @returns {Mailbox|undefined} The mailbox or undefined if not found
     */
    getMailbox(userId) {
        return this.mailboxes.get(userId);
    }

    /**
     * Get all mailboxes in the domain
     * @returns {Mailbox[]} Array of all mailboxes
     */
    getAllMailboxes() {
        return Array.from(this.mailboxes.values());
    }

    /**
     * Remove a user's mailbox
     * @param {string} userId - The user ID
     * @returns {boolean} True if removed, false if not found
     */
    removeMailbox(userId) {
        return this.mailboxes.delete(userId);
    }
}

export default Domain;