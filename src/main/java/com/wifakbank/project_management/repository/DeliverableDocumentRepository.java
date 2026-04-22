package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.DeliverableDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeliverableDocumentRepository extends JpaRepository<DeliverableDocument, Long> {
    List<DeliverableDocument> findByDeliverableId(Long deliverableId);
}
