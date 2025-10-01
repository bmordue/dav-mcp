import { DavClient } from '../utils/dav-client';
import { XmlParser } from '../utils/xml-parser';
import { Contact, DavServerConfig } from '../types';

export class CardDavHandler {
  private client: DavClient;

  constructor(config: DavServerConfig) {
    this.client = new DavClient(config);
  }

  async listAddressBooks(): Promise<Array<{ name: string; href: string; description?: string }>> {
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <card:addressbook-description />
    <card:supported-address-data />
  </d:prop>
</d:propfind>`;

    const response = await this.client.makeRequest({
      method: 'PROPFIND',
      path: '/addressbooks/',
      depth: '1',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
      body: propfindBody,
    });

    if (response.status !== 207) {
      throw new Error(`Failed to list address books: ${response.status}`);
    }

    const resources = await XmlParser.parsePropfindResponse(response.body);
    return resources
      .filter(resource => resource.contentType.includes('addressbook') || resource.href.includes('addressbook'))
      .map(resource => ({
        name: resource.href.split('/').pop() || 'Unknown',
        href: resource.href,
        description: undefined, // Would need more sophisticated XML parsing
      }));
  }

  async getContacts(addressBookPath: string): Promise<Contact[]> {
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:getetag />
    <card:address-data />
  </d:prop>
  <card:filter>
    <card:prop-filter name="FN">
    </card:prop-filter>
  </card:filter>
</card:addressbook-query>`;

    const response = await this.client.makeRequest({
      method: 'REPORT',
      path: addressBookPath,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: reportBody,
    });

    if (response.status !== 207) {
      throw new Error(`Failed to get contacts: ${response.status}`);
    }

    // Parse the response to extract contact data
    const contacts: Contact[] = [];
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
            const addressData = prop?.['card:address-data'] || prop?.['address-data'];
            
            if (addressData) {
              const vcardData = addressData._text || addressData;
              const parsedContacts = XmlParser.parseVCard(vcardData);
              contacts.push(...parsedContacts);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing contacts:', error);
    }

    return contacts;
  }

  async searchContacts(addressBookPath: string, query: string): Promise<Contact[]> {
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:getetag />
    <card:address-data />
  </d:prop>
  <card:filter>
    <card:prop-filter name="FN">
      <card:text-match collation="i;unicode-casemap">${query}</card:text-match>
    </card:prop-filter>
  </card:filter>
</card:addressbook-query>`;

    const response = await this.client.makeRequest({
      method: 'REPORT',
      path: addressBookPath,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: reportBody,
    });

    if (response.status !== 207) {
      throw new Error(`Failed to search contacts: ${response.status}`);
    }

    return this.parseContactsFromResponse(response.body);
  }

  async createContact(addressBookPath: string, contact: Contact): Promise<void> {
    const vcardData = this.contactToVcard(contact);
    const contactPath = `${addressBookPath}/${contact.uid}.vcf`;

    const response = await this.client.makeRequest({
      method: 'PUT',
      path: contactPath,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
      },
      body: vcardData,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to create contact: ${response.status}`);
    }
  }

  async deleteContact(contactPath: string): Promise<void> {
    const response = await this.client.makeRequest({
      method: 'DELETE',
      path: contactPath,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to delete contact: ${response.status}`);
    }
  }

  private async parseContactsFromResponse(responseBody: string): Promise<Contact[]> {
    const contacts: Contact[] = [];
    try {
      const parsed = await XmlParser.parseXml(responseBody);
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
            const addressData = prop?.['card:address-data'] || prop?.['address-data'];
            
            if (addressData) {
              const vcardData = addressData._text || addressData;
              const parsedContacts = XmlParser.parseVCard(vcardData);
              contacts.push(...parsedContacts);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing contacts:', error);
    }

    return contacts;
  }

  private contactToVcard(contact: Contact): string {
    return `BEGIN:VCARD
VERSION:3.0
UID:${contact.uid}
FN:${contact.fn}
${contact.email ? `EMAIL:${contact.email}` : ''}
${contact.phone ? `TEL:${contact.phone}` : ''}
${contact.organization ? `ORG:${contact.organization}` : ''}
END:VCARD`;
  }
}