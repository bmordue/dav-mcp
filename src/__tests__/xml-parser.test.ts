import { XmlParser } from '../utils/xml-parser';

describe('XmlParser', () => {
  describe('parseICalendar', () => {
    it('should parse a simple calendar event', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
DTSTART:20231201T100000Z
DTEND:20231201T110000Z
SUMMARY:Test Meeting
DESCRIPTION:This is a test event
LOCATION:Conference Room A
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

      const events = XmlParser.parseICalendar(icalData);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        uid: 'test-event-1',
        start: '20231201T100000Z',
        end: '20231201T110000Z',
        summary: 'Test Meeting',
        description: 'This is a test event',
        location: 'Conference Room A',
        status: 'CONFIRMED',
      });
    });

    it('should handle multiple events', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-1
DTSTART:20231201T100000Z
DTEND:20231201T110000Z
SUMMARY:First Event
END:VEVENT
BEGIN:VEVENT
UID:event-2
DTSTART:20231201T140000Z
DTEND:20231201T150000Z
SUMMARY:Second Event
END:VEVENT
END:VCALENDAR`;

      const events = XmlParser.parseICalendar(icalData);
      
      expect(events).toHaveLength(2);
      expect(events[0].uid).toBe('event-1');
      expect(events[1].uid).toBe('event-2');
    });
  });

  describe('parseVCard', () => {
    it('should parse a simple contact', () => {
      const vcardData = `BEGIN:VCARD
VERSION:3.0
UID:contact-1
FN:John Doe
EMAIL:john@example.com
TEL:+1234567890
ORG:Example Corp
END:VCARD`;

      const contacts = XmlParser.parseVCard(vcardData);
      
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({
        uid: 'contact-1',
        fn: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organization: 'Example Corp',
      });
    });

    it('should handle multiple contacts', () => {
      const vcardData = `BEGIN:VCARD
VERSION:3.0
UID:contact-1
FN:John Doe
EMAIL:john@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
UID:contact-2
FN:Jane Smith
EMAIL:jane@example.com
END:VCARD`;

      const contacts = XmlParser.parseVCard(vcardData);
      
      expect(contacts).toHaveLength(2);
      expect(contacts[0].fn).toBe('John Doe');
      expect(contacts[1].fn).toBe('Jane Smith');
    });
  });
});