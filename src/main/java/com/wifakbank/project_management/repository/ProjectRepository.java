package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Project;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    /** IDs triés — sans FETCH pour éviter les erreurs DISTINCT + ORDER BY + jointures multiples (Hibernate / MySQL). */
    @Query("SELECT p.id FROM Project p ORDER BY p.updatedAt DESC")
    List<Long> findAllProjectIdsOrdered();

    /**
     * Projets où l’utilisateur est créateur, CP ou participant.
     * Corrélation via MEMBER OF pour éviter un JOIN FETCH problématique.
     */
    @Query("""
            SELECT p.id FROM Project p
            WHERE p.chefProjet.id = :userId
               OR EXISTS (SELECT 1 FROM User u WHERE u.id = :userId AND u MEMBER OF p.members)
            ORDER BY p.updatedAt DESC
            """)
    List<Long> findAccessibleProjectIds(@Param("userId") Long userId);

    /** Projets où l'utilisateur est explicitement chef de projet. */
    @Query("SELECT p.id FROM Project p WHERE p.chefProjet.id = :userId ORDER BY p.updatedAt DESC")
    List<Long> findProjectIdsByChef(@Param("userId") Long userId);

    /** MOA : uniquement les fiches dont il est créateur (pas les projets où il est seulement participant). */
    @Query("SELECT p.id FROM Project p WHERE p.createdBy.id = :userId ORDER BY p.updatedAt DESC")
    List<Long> findProjectIdsByCreator(@Param("userId") Long userId);

    @EntityGraph(attributePaths = {"chefProjet", "createdBy", "members"})
    @Query("SELECT p FROM Project p WHERE p.id IN :ids")
    List<Project> findByIdInWithAssociations(@Param("ids") Collection<Long> ids);

    @EntityGraph(attributePaths = {"chefProjet", "createdBy", "members"})
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdWithAssociations(@Param("id") Long id);

    @EntityGraph(attributePaths = {"chefProjet", "createdBy", "members", "milestones"})
    @Query("SELECT p FROM Project p ORDER BY p.updatedAt DESC")
    List<Project> findAllWithPlanning();

    @EntityGraph(attributePaths = {"chefProjet", "createdBy", "members", "milestones"})
    List<Project> findByNameContainingIgnoreCaseOrderByUpdatedAtDesc(String name);

    boolean existsByCreatedBy_Id(Long userId);

    boolean existsByChefProjet_Id(Long userId);

    boolean existsByMembers_Id(Long userId);
}
