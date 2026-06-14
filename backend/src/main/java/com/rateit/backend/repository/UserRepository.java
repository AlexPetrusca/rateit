package com.rateit.backend.repository;

import com.rateit.backend.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Standard CRUD methods are automatically included
    Optional<User> findByPhoneNumber(String phoneNumber);
    Optional<User> findByUsername(String username);
    List<User> findAllByRole(String role);

    @Query("""
        select u from User u
        where u.deletedAt is null
          and lower(u.username) like lower(concat('%', :query, '%'))
        order by u.username asc
        """)
    List<User> searchVisibleUsersByUsername(@Param("query") String query, Pageable pageable);
}
