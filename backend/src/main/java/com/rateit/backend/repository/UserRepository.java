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

    // Ranked, typo-tolerant username search. Match tiers (exact > prefix >
    // substring > fuzzy trigram) order results by likely intent; within them,
    // trigram similarity ranks relevance, then shorter/alphabetical usernames.
    // `likeQuery` is the caller-escaped form for the LIKE tiers; `query` is raw
    // for exact/similarity. Requires the pg_trgm extension (similarity()).
    @Query(value = """
        select * from users u
        where u.deleted_at is null
          and u.username is not null
          and (
            lower(u.username) like lower(:likeQuery) || '%' escape '\\'
            or lower(u.username) like '%' || lower(:likeQuery) || '%' escape '\\'
            or similarity(lower(u.username), lower(:query)) >= :threshold
          )
        order by
          (lower(u.username) = lower(:query)) desc,
          (lower(u.username) like lower(:likeQuery) || '%' escape '\\') desc,
          (lower(u.username) like '%' || lower(:likeQuery) || '%' escape '\\') desc,
          similarity(lower(u.username), lower(:query)) desc,
          length(u.username) asc,
          lower(u.username) asc
        limit :limit
        """, nativeQuery = true)
    List<User> searchVisibleUsersByUsernameFuzzy(
        @Param("query") String query,
        @Param("likeQuery") String likeQuery,
        @Param("threshold") double threshold,
        @Param("limit") int limit
    );

    @Query("""
        select u from User u
        where u.deletedAt is null
          and u.username is not null
        order by u.username asc
        """)
    List<User> findVisibleUsers(Pageable pageable);
}
