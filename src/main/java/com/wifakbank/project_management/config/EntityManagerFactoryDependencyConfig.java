package com.wifakbank.project_management.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Ensures {@link AuthAuditLogTableRepair} runs after the {@code DataSource} and before Flyway
 * (when enabled) and JPA initialization.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class EntityManagerFactoryDependencyConfig implements BeanFactoryPostProcessor {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        if (beanFactory.containsBeanDefinition("flywayInitializer")) {
            addDependsOn(beanFactory.getBeanDefinition("flywayInitializer"), "authAuditLogTableRepair");
        }
        if (beanFactory.containsBeanDefinition("entityManagerFactory")) {
            addDependsOn(beanFactory.getBeanDefinition("entityManagerFactory"), "authAuditLogTableRepair");
        }
    }

    private static void addDependsOn(BeanDefinition def, String dependency) {
        Set<String> merged = new LinkedHashSet<>();
        merged.add(dependency);
        String[] existing = def.getDependsOn();
        if (existing != null) {
            merged.addAll(Arrays.asList(existing));
        }
        def.setDependsOn(merged.toArray(String[]::new));
    }
}
