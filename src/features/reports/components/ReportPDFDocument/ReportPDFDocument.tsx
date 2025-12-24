import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ProjectReportData } from '../../domain/report.types';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #050038',
    paddingBottom: 10,
  },
  logo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#050038',
    marginBottom: 5,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#050038',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050038',
    marginBottom: 8,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 9,
    color: '#666',
    width: '35%',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 9,
    color: '#000',
    width: '65%',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  metricCard: {
    width: '30%',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#050038',
  },
  metricUnit: {
    fontSize: 8,
    color: '#666',
  },
  activityList: {
    marginTop: 5,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 5,
    fontSize: 8,
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 4,
    height: 4,
    backgroundColor: '#2563EB',
    borderRadius: 2,
    marginRight: 6,
    marginTop: 3,
  },
  activityText: {
    flex: 1,
    color: '#333',
  },
  notesBox: {
    backgroundColor: '#FFF7ED',
    borderLeft: '3px solid #F59E0B',
    padding: 10,
    marginTop: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#999',
    textAlign: 'center',
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10,
  },
  emptyState: {
    fontSize: 8,
    color: '#999',
    fontStyle: 'italic',
  },
});

interface ReportPDFDocumentProps {
  data: ProjectReportData;
}

export function ReportPDFDocument({ data }: ReportPDFDocumentProps) {
  const { project, metrics, recentActivity, upcomingDeadlines, adminNotes } = data;

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>BRIANNA DAWES STUDIOS</Text>
          <Text style={styles.title}>Project Report</Text>
          <Text style={styles.subtitle}>Generated on {currentDate}</Text>
        </View>

        {/* Project Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Project Name:</Text>
            <Text style={styles.value}>{project.name}</Text>
          </View>
          {project.description && (
            <View style={styles.row}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{project.description}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Client:</Text>
            <Text style={styles.value}>
              {project.client.companyName || project.client.name}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{project.status.toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Priority:</Text>
            <Text style={styles.value}>{project.priority.toUpperCase()}</Text>
          </View>
          {project.startDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Start Date:</Text>
              <Text style={styles.value}>{formatDate(project.startDate)}</Text>
            </View>
          )}
          {project.dueDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>{formatDate(project.dueDate)}</Text>
            </View>
          )}
          {project.designers.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Design Team:</Text>
              <Text style={styles.value}>
                {project.designers.map((d) => d.name).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Metrics</Text>
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Completion Rate</Text>
              <Text style={styles.metricValue}>
                {Math.round(metrics.completionRate)}
                <Text style={styles.metricUnit}>%</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Deliverables</Text>
              <Text style={styles.metricValue}>{metrics.totalDeliverables}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Completed</Text>
              <Text style={styles.metricValue}>{metrics.completedDeliverables}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pending</Text>
              <Text style={styles.metricValue}>{metrics.pendingDeliverables}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Assets</Text>
              <Text style={styles.metricValue}>{metrics.totalAssets}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Bonus Assets</Text>
              <Text style={styles.metricValue}>{metrics.totalBonusAssets}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg. Approval Time</Text>
              <Text style={styles.metricValue}>
                {Math.round(metrics.averageApprovalTime)}
                <Text style={styles.metricUnit}> days</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Feedback</Text>
              <Text style={styles.metricValue}>{metrics.totalFeedback}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Resolved Feedback</Text>
              <Text style={styles.metricValue}>{metrics.resolvedFeedback}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {recentActivity.slice(0, 8).map((activity, i) => (
                <View key={i} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <Text style={styles.activityText}>
                    {activity.itemName} • {activity.type.replace(/_/g, ' ')}
                    {activity.userName && ` • by ${activity.userName}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Deadlines */}
        {upcomingDeadlines && upcomingDeadlines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            <View style={styles.activityList}>
              {upcomingDeadlines.slice(0, 5).map((deadline, i) => (
                <View key={i} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <Text style={styles.activityText}>
                    {deadline.name} • Due {formatDate(deadline.dueDate)} •{' '}
                    {deadline.daysRemaining} days remaining
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Admin Notes */}
        {adminNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{adminNotes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Brianna Dawes Studios © {new Date().getFullYear()} | Confidential
        </Text>
      </Page>
    </Document>
  );
}
