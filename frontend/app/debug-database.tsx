import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { DatabaseFixService } from '../services/DatabaseFixService'
import Colors from '../constants/Colors'

export default function DebugDatabase() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [healthReport, setHealthReport] = useState<any>(null)
  const [connectionTest, setConnectionTest] = useState<any>(null)
  const [dataTest, setDataTest] = useState<any>(null)

  useEffect(() => {
    runHealthCheck()
  }, [])

  const runHealthCheck = async () => {
    setLoading(true)
    try {
      const report = await DatabaseFixService.getDatabaseHealthReport()
      setHealthReport(report)
    } catch (error) {
      console.error('Health check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runConnectionTest = async () => {
    setLoading(true)
    try {
      const test = await DatabaseFixService.testDatabaseConnection()
      setConnectionTest(test)
    } catch (error) {
      console.error('Connection test error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runDataTest = async () => {
    setLoading(true)
    try {
      const test = await DatabaseFixService.testDataAccess()
      setDataTest(test)
    } catch (error) {
      console.error('Data test error:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyRLSFixes = async () => {
    setLoading(true)
    try {
      const result = await DatabaseFixService.applyRLSFixes()
      Alert.alert(
        'RLS Fixes Applied',
        `Success: ${result.success}\nApplied: ${result.appliedFixes.length}\nErrors: ${result.errors.length}`,
        [{ text: 'OK', onPress: () => runHealthCheck() }]
      )
    } catch (error) {
      Alert.alert('Error', `Failed to apply RLS fixes: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return Colors.success[500]
      case 'warning': return Colors.warning[500]
      case 'critical': return Colors.error[500]
      default: return Colors.neutral[500]
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'checkmark-circle'
      case 'warning': return 'warning'
      case 'critical': return 'close-circle'
      default: return 'help-circle'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Debug</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Health Report */}
        {healthReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Health</Text>
            <View style={styles.healthCard}>
              <View style={styles.healthHeader}>
                <Ionicons 
                  name={getStatusIcon(healthReport.overall)} 
                  size={24} 
                  color={getStatusColor(healthReport.overall)} 
                />
                <Text style={[styles.healthStatus, { color: getStatusColor(healthReport.overall) }]}>
                  {healthReport.overall.toUpperCase()}
                </Text>
              </View>
              
              {healthReport.issues.length > 0 && (
                <View style={styles.issuesContainer}>
                  <Text style={styles.issuesTitle}>Issues:</Text>
                  {healthReport.issues.map((issue: string, index: number) => (
                    <Text key={index} style={styles.issueText}>• {issue}</Text>
                  ))}
                </View>
              )}

              {healthReport.recommendations.length > 0 && (
                <View style={styles.recommendationsContainer}>
                  <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                  {healthReport.recommendations.map((rec: string, index: number) => (
                    <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                  ))}
                </View>
              )}

              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Data Stats:</Text>
                <Text style={styles.statText}>Profiles: {healthReport.stats.profiles}</Text>
                <Text style={styles.statText}>Tasks: {healthReport.stats.tasks}</Text>
                <Text style={styles.statText}>Applications: {healthReport.stats.applications}</Text>
                <Text style={styles.statText}>Chats: {healthReport.stats.chats}</Text>
                <Text style={styles.statText}>Messages: {healthReport.stats.messages}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Connection Test */}
        {connectionTest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connection Test</Text>
            <View style={styles.testCard}>
              <View style={styles.testHeader}>
                <Ionicons 
                  name={connectionTest.success ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={connectionTest.success ? Colors.success[500] : Colors.error[500]} 
                />
                <Text style={styles.testStatus}>
                  {connectionTest.success ? 'PASSED' : 'FAILED'}
                </Text>
              </View>
              
              {connectionTest.errors.length > 0 && (
                <View style={styles.errorsContainer}>
                  {connectionTest.errors.map((error: string, index: number) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}

              <View style={styles.tableStatusContainer}>
                <Text style={styles.tableStatusTitle}>Table Status:</Text>
                {connectionTest.tableStatus.map((table: any, index: number) => (
                  <View key={index} style={styles.tableStatusItem}>
                    <Ionicons 
                      name={table.accessible ? 'checkmark' : 'close'} 
                      size={16} 
                      color={table.accessible ? Colors.success[500] : Colors.error[500]} 
                    />
                    <Text style={styles.tableName}>{table.table}</Text>
                    <Text style={styles.tableCount}>({table.rowCount} rows)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Data Test */}
        {dataTest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Access Test</Text>
            <View style={styles.testCard}>
              <View style={styles.testHeader}>
                <Ionicons 
                  name={dataTest.success ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={dataTest.success ? Colors.success[500] : Colors.error[500]} 
                />
                <Text style={styles.testStatus}>
                  {dataTest.success ? 'PASSED' : 'FAILED'}
                </Text>
              </View>
              
              {dataTest.errors.length > 0 && (
                <View style={styles.errorsContainer}>
                  {dataTest.errors.map((error: string, index: number) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}

              <View style={styles.dataResultsContainer}>
                <Text style={styles.dataResultsTitle}>Data Retrieved:</Text>
                {Object.entries(dataTest.results).map(([key, value]: [string, any]) => (
                  <Text key={key} style={styles.dataResultText}>
                    {key}: {Array.isArray(value) ? value.length : 'N/A'} items
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]} 
            onPress={runHealthCheck}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Run Health Check</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={runConnectionTest}
            disabled={loading}
          >
            <Ionicons name="link" size={20} color={Colors.primary[500]} />
            <Text style={[styles.actionButtonText, { color: Colors.primary[500] }]}>Test Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={runDataTest}
            disabled={loading}
          >
            <Ionicons name="database" size={20} color={Colors.primary[500]} />
            <Text style={[styles.actionButtonText, { color: Colors.primary[500] }]}>Test Data Access</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]} 
            onPress={applyRLSFixes}
            disabled={loading}
          >
            <Ionicons name="construct" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Apply RLS Fixes</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Running tests...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  healthCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  issuesContainer: {
    marginBottom: 12,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error[600],
    marginBottom: 4,
  },
  issueText: {
    fontSize: 12,
    color: Colors.error[500],
    marginLeft: 8,
  },
  recommendationsContainer: {
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning[600],
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: Colors.warning[500],
    marginLeft: 8,
  },
  statsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 12,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginLeft: 8,
  },
  testCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorsContainer: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error[500],
    marginLeft: 8,
  },
  tableStatusContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 12,
  },
  tableStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  tableStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableName: {
    fontSize: 12,
    color: Colors.neutral[700],
    marginLeft: 8,
    flex: 1,
  },
  tableCount: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  dataResultsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 12,
  },
  dataResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  dataResultText: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginLeft: 8,
  },
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
  },
  secondaryButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  warningButton: {
    backgroundColor: Colors.warning[500],
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.neutral[600],
  },
})
