package com.wifakbank.project_management.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.DependsOn;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * MySQL can leave a ghost table entry (error 1932: "doesn't exist in engine") after crashes or
 * broken data directories. Hibernate then fails while reading table metadata. Dropping the broken
 * table lets Hibernate ({@code ddl-auto=update}) or Flyway recreate it.
 * <p>
 * All base tables in the current schema are probed so new entity tables do not need to be listed
 * manually.
 */
@Component("authAuditLogTableRepair")
@DependsOn("dataSource")
public class AuthAuditLogTableRepair implements InitializingBean {

    private static final int MYSQL_TABLESPACE_MISSING = 1932;
    private static final int MYSQL_UNKNOWN_TABLE = 1146;
    /** InnoDB: leftover tablespace blocks CREATE TABLE (e.g. after failed IMPORT / crash). */
    private static final int MYSQL_TABLESPACE_EXISTS = 1813;

    private final DataSource dataSource;
    private final Environment environment;

    public AuthAuditLogTableRepair(DataSource dataSource, Environment environment) {
        this.dataSource = dataSource;
        this.environment = environment;
    }

    @Override
    public void afterPropertiesSet() throws SQLException {
        if (!isMysqlDatasource()) {
            return;
        }
        try (Connection c = dataSource.getConnection()) {
            String schema = c.getCatalog();
            if (schema == null || schema.isBlank()) {
                return;
            }
            String listSql =
                    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                            + "WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'";
            try (PreparedStatement ps = c.prepareStatement(listSql)) {
                ps.setString(1, schema);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        repairTableIfGhost(c, rs.getString(1));
                    }
                }
            }
        }
    }

    private void repairTableIfGhost(Connection c, String table) throws SQLException {
        String q = quoteIdentifier(table);
        try (Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT 1 FROM " + q + " LIMIT 1")) {
            rs.next();
        } catch (SQLException e) {
            if (shouldDropAndRecreate(e)) {
                try (Statement drop = c.createStatement()) {
                    drop.execute("DROP TABLE IF EXISTS " + q);
                }
            } else if (e.getErrorCode() != MYSQL_UNKNOWN_TABLE) {
                throw e;
            }
        }
    }

    private static boolean shouldDropAndRecreate(SQLException e) {
        int code = e.getErrorCode();
        if (code == MYSQL_TABLESPACE_MISSING || code == MYSQL_TABLESPACE_EXISTS) {
            return true;
        }
        String msg = e.getMessage();
        if (msg != null && msg.contains("Tablespace") && msg.contains("exists")) {
            return true;
        }
        return false;
    }

    private static String quoteIdentifier(String name) {
        return "`" + name.replace("`", "``") + "`";
    }

    private boolean isMysqlDatasource() {
        String url = environment.getProperty("spring.datasource.url", "");
        return url.startsWith("jdbc:mysql:") || url.startsWith("jdbc:mariadb:");
    }
}
