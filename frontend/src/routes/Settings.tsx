import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { Select } from '../components/ui/Select'
import { TextField } from '../components/ui/TextField'
import type { Importance, Threshold } from '../api/types'
import {
  useBidCriteria,
  useCreateOwnerTeam,
  useHealth,
  useOwnerTeams,
  useScopingSettings,
  useUpdateBidCriterion,
  useUpdateOwnerTeam,
  useUpdateScopingSettings,
} from '../queries/config'
import { describeBands, IMPORTANCE_MULTIPLIER, THRESHOLD_MEANING } from '../lib/scoringRules'
import styles from './Settings.module.css'

function enabledHint(enabled: boolean, isDisqualifier: boolean): string {
  if (!enabled) return 'Ignored when scoring'
  return isDisqualifier ? 'Forces no-bid if triggered' : 'Included in the score'
}

const IMPORTANCE_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const ENABLED_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const THRESHOLD_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive' },
]

export function Settings() {
  const { data: health } = useHealth()
  const { data: criteria = [] } = useBidCriteria()
  const updateCriterion = useUpdateBidCriterion()
  const { data: scopingSettings } = useScopingSettings()
  const updateScopingSettings = useUpdateScopingSettings()
  const { data: ownerTeams = [] } = useOwnerTeams()
  const updateOwnerTeam = useUpdateOwnerTeam()
  const createOwnerTeam = useCreateOwnerTeam()
  const [newTeamName, setNewTeamName] = useState('')

  return (
    <div>
      <h1 className={styles.title}>Settings</h1>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>AI provider</h2>
        {health && (
          <div className={styles.providerRow}>
            <div>
              <span className={styles.providerLabel}>Text generation</span>
              {health.llmProvider} / {health.llmModel}
            </div>
            <div>
              <span className={styles.providerLabel}>Embeddings</span>
              {health.embedProvider}
            </div>
            <div>
              <span className={styles.providerLabel}>Knowledge base</span>
              {health.knowledgeDocumentCount} documents · {health.knowledgePassageCount} passages
            </div>
          </div>
        )}
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Bid / no-bid criteria</h2>
        <p className={styles.intro}>
          Scoping rates each enabled criterion Strong (2 points), Partial (1) or Weak (0), multiplied by its
          importance. The total as a percentage of the maximum is the score, which the threshold turns into a
          recommendation. If the disqualifier is triggered, the recommendation is no-bid whatever the score.
        </p>
        {scopingSettings && (
          <div className={styles.thresholdRow}>
            <Select
              label="Threshold"
              value={scopingSettings.threshold}
              onValueChange={(value) => updateScopingSettings.mutate(value as Threshold)}
              options={THRESHOLD_OPTIONS}
              hint={THRESHOLD_MEANING[scopingSettings.threshold]}
            />
            <p className={styles.bands}>{describeBands(scopingSettings.threshold)}</p>
          </div>
        )}
        <table className={styles.criteriaTable}>
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Enabled</th>
              <th>Importance</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr key={criterion.id}>
                <td className={criterion.enabled ? undefined : styles.criterionOff}>
                  <div className={styles.criterionName}>{criterion.name}</div>
                  <div className={styles.criterionDescription}>{criterion.description}</div>
                </td>
                <td>
                  <Select
                    label={`${criterion.name} enabled`}
                    hideLabel
                    value={criterion.enabled ? 'yes' : 'no'}
                    onValueChange={(value) =>
                      updateCriterion.mutate({ id: criterion.id, input: { enabled: value === 'yes' } })
                    }
                    options={ENABLED_OPTIONS}
                    hint={enabledHint(criterion.enabled, criterion.isDisqualifier)}
                  />
                </td>
                <td>
                  {criterion.isDisqualifier ? (
                    <Pill tone="neutral">Not applicable</Pill>
                  ) : (
                    <Select
                      label={`${criterion.name} importance`}
                      hideLabel
                      value={criterion.importance ?? 'medium'}
                      onValueChange={(value) =>
                        updateCriterion.mutate({
                          id: criterion.id,
                          input: { importance: value as Importance },
                        })
                      }
                      options={IMPORTANCE_OPTIONS}
                      hint={`Counts ${IMPORTANCE_MULTIPLIER[criterion.importance ?? 'medium']}× in the score`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Owner teams</h2>
        <div>
          {ownerTeams.map((team) => (
            <div key={team.id} className={styles.teamRow}>
              <span>
                {team.name} {team.isDefault && <Pill tone="ink">Default</Pill>}
              </span>
              {!team.isDefault && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    updateOwnerTeam.mutate({ id: team.id, input: { active: !team.active } })
                  }
                >
                  {team.active ? 'Deactivate' : 'Activate'}
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addTeamRow}>
          <TextField
            label="New team name"
            hideLabel
            placeholder="Add a team"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={!newTeamName.trim() || createOwnerTeam.isPending}
            onClick={() => {
              createOwnerTeam.mutate({ name: newTeamName.trim() })
              setNewTeamName('')
            }}
          >
            Add team
          </Button>
        </div>
      </Card>
    </div>
  )
}
