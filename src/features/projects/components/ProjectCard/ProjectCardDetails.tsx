/**
 * ProjectCardDetails - Expanded briefing sections and team display
 */

import { memo } from 'react';
import { useProjectCard } from './ProjectCardContext';
import styles from './ProjectCard.module.css';

export const ProjectCardDetails = memo(function ProjectCardDetails() {
  const { project, isExpanded } = useProjectCard();

  if (!isExpanded) {
    return null;
  }

  return (
    <div className={styles.expanded}>
      {/* Goals & Objectives */}
      {project.briefing?.goals && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>GOALS & OBJECTIVES</h4>
          <p className={styles.sectionText}>{project.briefing.goals}</p>
        </div>
      )}

      {/* Project Overview - show "Needs attention" if empty */}
      {!project.briefing?.projectOverview && !project.briefing?.goals && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>PROJECT OVERVIEW</h4>
          <p className={`${styles.sectionText} ${styles.needsAttention}`}>Needs attention</p>
        </div>
      )}

      {/* Project Overview */}
      {project.briefing?.projectOverview && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>PROJECT OVERVIEW</h4>
          <p className={styles.sectionText}>{project.briefing.projectOverview}</p>
        </div>
      )}

      {/* Target Audience */}
      {project.briefing?.targetAudience && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>TARGET AUDIENCE</h4>
          <p className={styles.sectionText}>{project.briefing.targetAudience}</p>
        </div>
      )}

      {/* Deliverables Required */}
      {project.briefing?.deliverables && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>DELIVERABLES REQUIRED</h4>
          <p className={styles.sectionText}>{project.briefing.deliverables}</p>
        </div>
      )}

      {/* Timeline Phases */}
      {project.briefing?.timeline && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>TIMELINE PHASES</h4>
          <p className={styles.sectionText}>{project.briefing.timeline}</p>
        </div>
      )}

      {/* Final Messaging */}
      {project.briefing?.finalMessaging && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>FINAL MESSAGING / COPY</h4>
          <p className={styles.sectionText}>{project.briefing.finalMessaging}</p>
        </div>
      )}

      {/* Resource Links */}
      {project.briefing?.resourceLinks && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>RESOURCE LINKS / ASSETS</h4>
          <p className={styles.sectionText}>{project.briefing.resourceLinks}</p>
        </div>
      )}

      {/* Inspirations */}
      {project.briefing?.inspirations && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>INSPIRATIONS / REFERENCES</h4>
          <p className={styles.sectionText}>{project.briefing.inspirations}</p>
        </div>
      )}

      {/* Style Notes */}
      {project.briefing?.styleNotes && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>STYLE / DESIGN NOTES</h4>
          <p className={styles.sectionText}>{project.briefing.styleNotes}</p>
        </div>
      )}

      {/* Additional Notes */}
      {project.briefing?.additionalNotes && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>ADDITIONAL NOTES</h4>
          <p className={styles.sectionText}>{project.briefing.additionalNotes}</p>
        </div>
      )}

      {/* Designers */}
      {project.designers.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>TEAM</h4>
          <div className={styles.designersList}>
            {project.designers.map((designer) => (
              <div key={designer.id} className={styles.designerItem}>
                <div className={styles.designerAvatar}>
                  {designer.avatarUrl ? (
                    <img src={designer.avatarUrl} alt={designer.name} />
                  ) : (
                    <span>{designer.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span>{designer.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
