import { parseString } from 'xml2js';
import { CalendarEvent, Contact, DavResource } from '../types';

export class XmlParser {
  static async parseXml(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false, ignoreAttrs: false }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  static async parsePropfindResponse(xml: string): Promise<DavResource[]> {
    try {
      const parsed = await this.parseXml(xml);
      const resources: DavResource[] = [];
      
      const multistatus = parsed['d:multistatus'] || parsed.multistatus;
      if (!multistatus) return resources;

      const responses = Array.isArray(multistatus['d:response'] || multistatus.response) 
        ? multistatus['d:response'] || multistatus.response
        : [multistatus['d:response'] || multistatus.response];

      for (const response of responses) {
        if (!response) continue;
        
        const href = response['d:href'] || response.href;
        const propstat = response['d:propstat'] || response.propstat;
        
        if (href && propstat) {
          const prop = propstat['d:prop'] || propstat.prop;
          const etag = prop?.['d:getetag'] || prop?.getetag;
          const contentType = prop?.['d:getcontenttype'] || prop?.getcontenttype;
          const lastModified = prop?.['d:getlastmodified'] || prop?.getlastmodified;

          resources.push({
            href: href._text || href,
            etag: etag?._text || etag,
            contentType: contentType?._text || contentType || 'unknown',
            lastModified: lastModified?._text || lastModified,
          });
        }
      }

      return resources;
    } catch (error) {
      throw new Error(`Failed to parse PROPFIND response: ${error}`);
    }
  }

  static parseICalendar(icalData: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const lines = icalData.split(/\r?\n/);
    let currentEvent: Partial<CalendarEvent> = {};
    let inEvent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
      } else if (trimmedLine === 'END:VEVENT' && inEvent) {
        if (currentEvent.uid && currentEvent.summary && currentEvent.start && currentEvent.end) {
          events.push(currentEvent as CalendarEvent);
        }
        inEvent = false;
        currentEvent = {};
      } else if (inEvent) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':');
        
        switch (key) {
          case 'UID':
            currentEvent.uid = value;
            break;
          case 'SUMMARY':
            currentEvent.summary = value;
            break;
          case 'DTSTART':
            currentEvent.start = value;
            break;
          case 'DTEND':
            currentEvent.end = value;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value;
            break;
          case 'LOCATION':
            currentEvent.location = value;
            break;
          case 'STATUS':
            currentEvent.status = value as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
            break;
        }
      }
    }

    return events;
  }

  static parseVCard(vcardData: string): Contact[] {
    const contacts: Contact[] = [];
    const lines = vcardData.split(/\r?\n/);
    let currentContact: Partial<Contact> = {};
    let inContact = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === 'BEGIN:VCARD') {
        inContact = true;
        currentContact = {};
      } else if (trimmedLine === 'END:VCARD' && inContact) {
        if (currentContact.uid && currentContact.fn) {
          contacts.push(currentContact as Contact);
        }
        inContact = false;
        currentContact = {};
      } else if (inContact) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':');
        
        switch (key) {
          case 'UID':
            currentContact.uid = value;
            break;
          case 'FN':
            currentContact.fn = value;
            break;
          case 'EMAIL':
            currentContact.email = value;
            break;
          case 'TEL':
            currentContact.phone = value;
            break;
          case 'ORG':
            currentContact.organization = value;
            break;
        }
      }
    }

    return contacts;
  }
}