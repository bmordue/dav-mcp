import { DavClient } from '../utils/dav-client';
import { XmlParser } from '../utils/xml-parser';
import { CalendarEvent, DavServerConfig } from '../types';

export class CalDavHandler {
  private client: DavClient;

  constructor(config: DavServerConfig) {
    this.client = new DavClient(config);
  }

  async listCalendars(): Promise<Array<{ name: string; href: string; description?: string }>> {
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <c:calendar-description />
    <c:supported-calendar-component-set />
  </d:prop>
</d:propfind>`;

    const response = await this.client.makeRequest({
      method: 'PROPFIND',
      path: '/calendars/',
      depth: '1',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
      body: propfindBody,
    });

    if (response.status !== 207) {
      throw new Error(`Failed to list calendars: ${response.status}`);
    }

    const resources = await XmlParser.parsePropfindResponse(response.body);
    return resources
      .filter(resource => resource.contentType.includes('calendar'))
      .map(resource => ({
        name: resource.href.split('/').pop() || 'Unknown',
        href: resource.href,
        description: undefined, // Would need more sophisticated XML parsing
      }));
  }

  async getCalendarEvents(calendarPath: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    const timeRange = startDate && endDate ? 
      `<c:time-range start="${startDate}" end="${endDate}"/>` : '';

    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        ${timeRange}
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

    const response = await this.client.makeRequest({
      method: 'REPORT',
      path: calendarPath,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: reportBody,
    });

    if (response.status !== 207) {
      throw new Error(`Failed to get calendar events: ${response.status}`);
    }

    // Parse the response to extract calendar data
    const events: CalendarEvent[] = [];
    try {
      const parsed = await XmlParser.parseXml(response.body);
      const multistatus = parsed['d:multistatus'] || parsed.multistatus;
      
      if (multistatus) {
        const responses = Array.isArray(multistatus['d:response'] || multistatus.response) 
          ? multistatus['d:response'] || multistatus.response
          : [multistatus['d:response'] || multistatus.response];

        for (const resp of responses) {
          if (!resp) continue;
          
          const propstat = resp['d:propstat'] || resp.propstat;
          if (propstat) {
            const prop = propstat['d:prop'] || propstat.prop;
            const calendarData = prop?.['c:calendar-data'] || prop?.['calendar-data'];
            
            if (calendarData) {
              const icalData = calendarData._text || calendarData;
              const parsedEvents = XmlParser.parseICalendar(icalData);
              events.push(...parsedEvents);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing calendar events:', error);
    }

    return events;
  }

  async createEvent(calendarPath: string, event: CalendarEvent): Promise<void> {
    const icalData = this.eventToIcal(event);
    const eventPath = `${calendarPath}/${event.uid}.ics`;

    const response = await this.client.makeRequest({
      method: 'PUT',
      path: eventPath,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
      },
      body: icalData,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to create event: ${response.status}`);
    }
  }

  async deleteEvent(eventPath: string): Promise<void> {
    const response = await this.client.makeRequest({
      method: 'DELETE',
      path: eventPath,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
  }

  private eventToIcal(event: CalendarEvent): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//dav-mcp//CalDAV Client//EN
BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${now}
DTSTART:${event.start}
DTEND:${event.end}
SUMMARY:${event.summary}
${event.description ? `DESCRIPTION:${event.description}` : ''}
${event.location ? `LOCATION:${event.location}` : ''}
${event.status ? `STATUS:${event.status}` : 'STATUS:CONFIRMED'}
END:VEVENT
END:VCALENDAR`;
  }
}