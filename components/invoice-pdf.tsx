import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font,
    // Image 
} from '@react-pdf/renderer';

// Register DM Mono fonts from local files
Font.register({
  family: 'DM Mono',
  fonts: [
    {
      src: '/fonts/DMMono-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/DMMono-Medium.ttf',
      fontWeight: 'bold',
    },
    {
      src: '/fonts/DMMono-Italic.ttf',
      fontStyle: 'italic',
    },
    {
      src: '/fonts/DMMono-MediumItalic.ttf',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
  ],
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 12,
    fontFamily: 'DM Mono',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  invoiceTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  invoiceNumberLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: '#10B981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  billingSection: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  billedToSection: {
    flex: 1,
    padding: 16,
    // backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    marginRight: 0,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#E5E7EB',
  },
  dueDateSection: {
    flex: 1,
    padding: 16,
    // backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 0,
    marginLeft: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionValueRegular: {
    fontSize: 12,
    color: '#000000',
  },
  addressSection: {
    padding: 16,
    paddingTop: 32,
    paddingBottom: 32,
    // backgroundColor: '#F9FAFB',
    borderRadius: 5,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 5,
    marginBottom: 30,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
  },
  itemsTable: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderLeftColor: '#E5E7EB',
    borderRightColor: '#E5E7EB',
  },
  tableRowText: {
    fontSize: 10,
    color: '#000000',
  },
  itemsColumn: {
    flex: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  qtyColumn: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  rateColumn: {
    flex: 1,
    textAlign: 'right',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  totalColumn: {
    flex: 1,
    textAlign: 'right',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  totalsSection: {
    alignItems: 'flex-end',
    // marginTop: 20,
  },
  totalsContainer: {
    width: 250,
    padding: 20,
    // backgroundColor: '#F9FAFB',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#000000',
  },
  totalValue: {
    fontSize: 10,
    color: '#000000',
  },
  finalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  finalTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  notesSection: {
    marginTop: 30,
    padding: 16,
    // backgroundColor: '#F9FAFB',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.4,
  },
});

interface InvoicePDFProps {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    notes?: string;
    terms?: string;
    customer?: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
    };
    business?: {
      name: string;
    };
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, items }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumberLabel}>Invoice Number</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>
        </View>

        {/* Billing Section */}
        <View style={styles.billingSection}>
          <View style={styles.billedToSection}>
            <Text style={styles.sectionLabel}>Billed to</Text>
            <Text style={styles.sectionValue}>
              {invoice.customer?.name || 'Customer Name'}
            </Text>
            {invoice.customer?.email && (
              <Text style={styles.sectionValueRegular}>{invoice.customer.email}</Text>
            )}
          </View>
          <View style={styles.dueDateSection}>
            <Text style={styles.sectionLabel}>Due date</Text>
            <Text style={styles.sectionValue}>
              {invoice.due_date ? formatDate(invoice.due_date) : formatDate(invoice.invoice_date)}
            </Text>
          </View>
        </View>

        {/* Address Section */}
        {invoice.customer && (
          <View style={styles.addressSection}>
            <Text style={styles.sectionLabel}>Address</Text>
            <Text style={styles.sectionValueRegular}>
              {[
                invoice.customer.address,
                invoice.customer.city,
                invoice.customer.state,
                invoice.customer.zip_code
              ].filter(Boolean).join(', ') || 'No address provided'}
            </Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.itemsColumn]}>Items</Text>
            <Text style={[styles.tableHeaderText, styles.qtyColumn]}>QTY</Text>
            <Text style={[styles.tableHeaderText, styles.rateColumn]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.totalColumn]}>Total</Text>
          </View>
          
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableRowText, styles.itemsColumn]}>
                {item.description}
              </Text>
              <Text style={[styles.tableRowText, styles.qtyColumn]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableRowText, styles.rateColumn]}>
                {formatCurrency(item.unit_price)}
              </Text>
              <Text style={[styles.tableRowText, styles.totalColumn]}>
                {formatCurrency(item.total_price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>$0</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax_amount)}</Text>
            </View>
            <View style={styles.finalTotal}>
              <Text style={styles.finalTotalLabel}>Total</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(invoice.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
