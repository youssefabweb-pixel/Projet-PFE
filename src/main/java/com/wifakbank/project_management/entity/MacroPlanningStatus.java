package com.wifakbank.project_management.entity;

/**
 * Cycle de vie du macro-planning d'un projet :
 * <ol>
 *   <li>{@link #DRAFT}  — le chef de projet crée les jalons (état initial après affectation).</li>
 *   <li>{@link #SOUMIS} — le chef a soumis la planification pour validation PMO.</li>
 *   <li>{@link #VALIDE} — le PMO a validé ; les dates des jalons sont figées, les tâches sont débloquées.</li>
 * </ol>
 */
public enum MacroPlanningStatus {
    DRAFT,
    SOUMIS,
    VALIDE
}
